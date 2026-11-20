"""Run every stage and replace `data/api/v1/` in one step (`game-data-api` skill).

The build writes a new folder beside the API, validates it, and only then
swaps it in, so a failure leaves the last good output. Unchanged records keep
their `updateTime`, and an unchanged release its index stamp (ADR 0005 D3).
Slugs come from `names.assign_slugs`; the registry that keeps them is T-0099's.
"""

import json
import shutil
import tempfile
from collections.abc import Mapping
from pathlib import Path
from typing import Any

from soccer_cards_data import grades, names, normalise, photos, wikidata
from soccer_cards_data.commons import Avatar, check_photo
from soccer_cards_data.http import PoliteClient
from soccer_cards_data.ratings import FORMULA_VERSION
from soccer_cards_data.validate import ValidationError, validate

API_DIR = Path(__file__).resolve().parents[3] / "api" / "v1"
MAX_PHOTO_BYTES = 25_000_000  # The largest original photo downloaded.
LISTS = ("clubs", "credits", "players")  # In the order the index lists them.
STAMP = ("dataVersion", "generateTime")  # Index fields that move with a release.


class BuildError(Exception):
    """The run stopped before the swap. The last good output is untouched."""


def build(
    client: PoliteClient,
    *,
    now: str,
    api_dir: Path = API_DIR,
    grades_file: Path = grades.PLAYERS_FILE,
    overrides_file: Path = grades.OVERRIDES_FILE,
) -> tuple[str, ...]:
    """Build the API at `now`, an RFC 3339 moment, and return what was dropped.

    Raises:
        BuildError: No players, no single national team code, or a schema
            failure. A stage's own error passes through. Nothing is swapped.
    """
    entries = grades.load_grades(grades_file)
    if not entries:
        raise BuildError(f"{grades_file.name} lists no players")
    overrides = grades.load_overrides(entries, overrides_file)
    facts = {qid: wikidata.fetch_player(client, qid) for qid in sorted(entries)}
    years = {q: y for q, f in facts.items() if (y := names.birth_year(f)) is not None}
    labels = {qid: names.display_name(f) for qid, f in facts.items()}
    slugs = names.assign_slugs(labels, years)
    problems = [line for f in facts.values() for line in f.skipped]
    api_dir.parent.mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix=f".{api_dir.name}-", dir=api_dir.parent))
    try:
        records = []
        for qid, fact in facts.items():
            photo = _photo(client, fact, slugs[qid], work)
            if isinstance(photo, Avatar):
                problems.append(f"{qid}: avatar, {photo.reason!a}")
            record = normalise.build_player(
                fact,
                entries[qid],
                overrides.get(qid),
                photo,
                slug=slugs[qid],
                national_team_code=_team_code(fact),
                update_time=now,
            )
            records.append(record)
            problems += record.problems
        _write_all(work, api_dir, records, now)
        try:
            validate(work)
        except ValidationError as exc:
            raise BuildError(str(exc)) from exc
        _swap(work, api_dir)
    finally:
        shutil.rmtree(work, ignore_errors=True)
    return tuple(problems)


def _photo(
    client: PoliteClient, fact: wikidata.PlayerFacts, slug: str, work: Path
) -> normalise.SizedPhoto | Avatar | None:
    """Check the player's Commons photo, and write it when it may be published."""
    if fact.photo is None:
        return None
    decision = check_photo(client, fact.photo)
    if isinstance(decision, Avatar):
        return decision
    image = client.get_bytes(decision.image_url, max_bytes=MAX_PHOTO_BYTES)
    return normalise.SizedPhoto(decision, photos.write_photo(image, slug, work))


def _team_code(fact: wikidata.PlayerFacts) -> str:
    """Return the one FIFA code the player's national teams share, youth included."""
    codes = sorted({s.code for s in fact.national_teams if s.code})
    if len(codes) != 1:
        raise BuildError(f"{fact.qid}: needs one national team code, found {codes}")
    return codes[0]


def _write_all(
    work: Path, old: Path, records: list[normalise.PlayerRecord], now: str
) -> None:
    """Write every file into `work`, keeping the times of what didn't change."""
    club_names = {
        r.club_qid: r.club_display_name
        for r in records
        if r.club_qid and r.club_display_name
    }
    club_slugs = names.assign_slugs(club_names)
    old_list = _load(old / "clubs.json", {"clubs": []})["clubs"]
    old_clubs = {c["name"]: c for c in old_list}
    clubs: dict[str, dict[str, object]] = {}
    for record in records:
        if record.club_qid in club_slugs:
            club = f"clubs/{club_slugs[record.club_qid]}"
            record.player["club"] = record.summary["club"] = club
            body: dict[str, object] = {"name": club, "updateTime": now}
            body["displayName"] = club_names[record.club_qid]
            clubs[club] = _keep_time(body, old_clubs.get(club))
        path = f"{record.player['name']}.json"
        _write(work / path, _keep_time(record.player, _load(old / path, None)))
    bodies: dict[str, list[dict[str, object]]] = {
        "clubs": list(clubs.values()),
        "credits": [
            {"player": r.player["name"]} | {k: p[k] for k in ("uri", "attribution")}
            for r in records
            if isinstance(p := r.player.get("photo"), dict)
        ],
        "players": [r.summary for r in records],
    }
    for name, items in bodies.items():
        key = "player" if name == "credits" else "name"
        _write(work / f"{name}.json", {name: sorted(items, key=lambda i: str(i[key]))})
    index: dict[str, object] = {
        "formulaVersion": FORMULA_VERSION,
        "collections": [
            {"collectionId": c, "uri": f"{c}.json", "schemaId": f"{c}.schema.json"}
            | {"itemCount": len(bodies[c])}
            for c in LISTS
        ],
    }
    previous: dict[str, Any] = _load(old / "index.json", {})
    same = {k: v for k, v in previous.items() if k not in STAMP} == index
    if same and _files(work) == _files(old):
        index |= {k: previous[k] for k in STAMP}
    else:
        version = previous.get("dataVersion", 0) + 1
        index |= {"dataVersion": version, "generateTime": now}
    _write(work / "index.json", index)


def _keep_time(new: dict[str, object], old: object) -> dict[str, object]:
    """Keep the old `updateTime` when nothing else in the record changed."""
    if isinstance(old, dict) and {**old, "updateTime": ""} == {**new, "updateTime": ""}:
        return new | {"updateTime": old["updateTime"]}
    return new


def _files(root: Path) -> dict[str, bytes]:
    """Return every file but the index, by its path inside `root`."""
    found = (p for p in sorted(root.rglob("*")) if p.is_file())
    files = {p.relative_to(root).as_posix(): p.read_bytes() for p in found}
    files.pop("index.json", None)
    return files


def _swap(work: Path, api_dir: Path) -> None:
    """Move `work` into place. If the second rename fails, the old copy goes back."""
    retired = work.with_name(work.name + "-old")
    if api_dir.exists():
        api_dir.rename(retired)
    try:
        work.rename(api_dir)
    except OSError:
        if retired.exists():
            retired.rename(api_dir)
        raise
    shutil.rmtree(retired, ignore_errors=True)


def _write(path: Path, body: Mapping[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(body, ensure_ascii=False, indent=2, sort_keys=True)
    path.write_text(text + "\n", encoding="utf-8")


def _load(path: Path, missing: Any) -> Any:
    """Return the file's JSON, or `missing` when there is no such file."""
    if not path.is_file():
        return missing
    return json.loads(path.read_text(encoding="utf-8"))
