"""Check an API folder against `packages/schema/schemas/v1` (ADR 0003 D2).

The validate stage of the `game-data-api` skill. It runs on the folder the
build wrote, before that folder replaces the published one, so a file that
breaks its schema or a photo without a complete credit stops the run.
"""

import json
from pathlib import Path
from typing import Any

# jsonschema ships no py.typed marker. Its validator is used only in `validate`.
from jsonschema import Draft202012Validator  # type: ignore[import-untyped]
from referencing import Registry, Resource

SCHEMA_DIR = Path(__file__).resolve().parents[4] / "packages/schema/schemas/v1"
COLLECTIONS = ("index", "clubs", "credits", "players")
ROOT_ENTRIES = {f"{name}.json" for name in COLLECTIONS} | {"players", "photos"}


class ValidationError(Exception):
    """An API file breaks its schema. The message names the file and field."""


def validate(api_dir: Path, schema_dir: Path = SCHEMA_DIR) -> None:
    """Check every file in `api_dir` against its schema, and every photo's credit.

    A photo is credited when `credits.json` lists its path. The schema makes
    each listed credit complete: author, licence and Commons page.

    Raises:
        ValidationError: Names the first file that fails, the field and why.
    """
    _refuse_unknown_files(api_dir)
    schemas = {p.name: _load(p) for p in sorted(schema_dir.glob("*.schema.json"))}
    registry: Registry[Any] = Registry().with_resources(
        (name, Resource.from_contents(body)) for name, body in schemas.items()
    )
    files = [(f"{name}.json", f"{name}.schema.json") for name in COLLECTIONS]
    files += [
        (f"players/{p.name}", "player.schema.json")
        for p in sorted((api_dir / "players").glob("*"))
    ]
    for rel, schema in files:
        if not (api_dir / rel).is_file():
            raise ValidationError(f"{rel} is missing")
        validator = Draft202012Validator(schemas[schema], registry=registry)
        errors = sorted(validator.iter_errors(_load(api_dir / rel, rel)), key=str)
        if errors:
            # ascii() escapes fetched text, so a message can't rewrite the terminal.
            reason = ascii(errors[0].message[:200])
            raise ValidationError(f"{rel} {errors[0].json_path}: {reason}")
    credits = _load(api_dir / "credits.json", "credits.json")["credits"]
    credited: set[str] = set()
    for index, credit in enumerate(credits):
        if credit["uri"] in credited:
            raise ValidationError(
                f"credits.json $.credits[{index}]: photo {credit['uri']} is repeated"
            )
        credited.add(credit["uri"])
    for photo in sorted((api_dir / "photos").glob("*")):
        if f"photos/{photo.name}" not in credited:
            raise ValidationError(f"photos/{photo.name} has no credit")
    summary_fields = set(
        schemas["player.schema.json"]["$defs"]["playerSummary"]["properties"]
    )
    _check_across_files(api_dir, credits, credited, summary_fields)


def _check_across_files(
    api_dir: Path,
    credits: list[dict[str, Any]],
    credited: set[str],
    summary_fields: set[str],
) -> None:
    """Check what one schema can't see: unique ids, references, matching copies.

    The schema already ties a player's rating group to its position inside each
    file. Here the list's summary must also equal the full record, so the two
    can't disagree on position or ratings.
    """
    players = _load(api_dir / "players.json", "players.json")["players"]
    clubs = _load(api_dir / "clubs.json", "clubs.json")["clubs"]
    club_names = _unique_names(clubs, "clubs.json")
    player_names = _unique_names(players, "players.json")
    files = {p.name for p in (api_dir / "players").glob("*.json")}
    for summary in players:
        name = summary["name"]
        rel = f"{name.removeprefix('players/')}.json"
        if rel not in files:
            raise ValidationError(f"players.json {name}: players/{rel} is missing")
        full = _load(api_dir / "players" / rel, f"players/{rel}")
        if full["name"] != name:
            raise ValidationError(f"players/{rel} name {full['name']!r} != {name!r}")
        for field in sorted(summary_fields):
            if full.get(field) != summary.get(field):
                raise ValidationError(
                    f"players.json {name}: {field} differs from players/{rel}"
                )
        if "club" in full and full["club"] not in club_names:
            raise ValidationError(
                f"players.json {name}: club {full['club']} is not in clubs.json"
            )
        photo = summary.get("photo")
        if photo and photo["uri"] not in credited:
            raise ValidationError(
                f"players.json {name}: photo {photo['uri']} has no credit"
            )
    for rel in sorted(files):
        if f"players/{rel.removesuffix('.json')}" not in player_names:
            raise ValidationError(f"players/{rel} is not in players.json")
    for index, credit in enumerate(credits):
        where = f"credits.json $.credits[{index}]"
        if credit["player"] not in player_names:
            raise ValidationError(f"{where}: player {credit['player']} is unknown")
        if not (api_dir / credit["uri"]).is_file():
            raise ValidationError(f"{where}: photo {credit['uri']} is missing")


def _unique_names(items: list[dict[str, Any]], label: str) -> set[str]:
    """Return the resource names in a list, failing on a repeat."""
    names: set[str] = set()
    for item in items:
        if item["name"] in names:
            raise ValidationError(f"{label} {item['name']}: name is not unique")
        names.add(item["name"])
    return names


def _refuse_unknown_files(api_dir: Path) -> None:
    """Fail on any path that is not part of the API's layout."""
    for entry in sorted(api_dir.iterdir()):
        if entry.name not in ROOT_ENTRIES:
            raise ValidationError(f"{entry.name} is not an API file")
    for folder, suffix in (("players", ".json"), ("photos", ".webp")):
        for entry in sorted((api_dir / folder).glob("*")):
            if not entry.is_file() or entry.suffix != suffix:
                raise ValidationError(f"{folder}/{entry.name} is not an API file")


def _load(path: Path, label: str | None = None) -> Any:
    """Read a JSON file, turning a decode or parse failure into ValidationError."""
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValidationError(f"{label or path.name} is not UTF-8 JSON: {exc}") from exc
