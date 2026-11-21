import io
import json
from functools import partial
from pathlib import Path
from typing import Any

import httpx
import pytest
from PIL import Image

from soccer_cards_data import build
from soccer_cards_data.build import BuildError
from soccer_cards_data.http import FetchError, PoliteClient
from soccer_cards_data.ratings import FORMULA_VERSION, OUTFIELD_RATINGS
from soccer_cards_data.validate import ValidationError, validate

FIXTURES = Path(__file__).parent / "fixtures"
PHOTO = "photos/lionel-messi.webp"
RENAME = Path.rename  # The real one, which the interrupted swap wraps.
FIRST, LATER = "2026-11-21T09:00:00Z", "2026-11-22T10:30:00Z"
KEEPER = ("diving", "handling", "kicking", "reflexes", "speed", "positioning")

_dump = partial(json.dumps, ensure_ascii=False, indent=2, sort_keys=True)


class FakeWikimedia:
    """Answers from the saved replies, so no test reaches the network.

    Messi's photo is CC BY-SA and Neuer's is GFDL, which gives the avatar.
    """

    def __init__(self, *, no_photo: tuple[str, ...] = (), image: int = 200) -> None:
        self.no_photo, self.image, self.asked = no_photo, image, list[str]()
        self.positions = dict[str, list[str]]()  # Replaces a player's P413.
        self.open_teams = list[str]()  # Teams whose spells have no end date.
        teams = [FIXTURES / f"wikidata/{q}-teams.json" for q in ("Q615", "Q107365")]
        self.teams = [_json(path) for path in teams]

    def without_codes(self) -> "FakeWikimedia":
        """Drop every national team's FIFA code (P3441), and return self."""
        for entity in (e for t in self.teams for e in t["entities"].values()):
            entity.get("claims", {}).pop("P3441", None)
        return self

    def __call__(self, request: httpx.Request) -> httpx.Response:
        params = request.url.params
        self.asked.append(params.get("titles") or params.get("ids") or str(request.url))
        if request.url.host == "upload.wikimedia.org":
            out = io.BytesIO()
            Image.new("RGB", (60, 80), (20, 120, 60)).save(out, "PNG")
            return httpx.Response(self.image, content=out.getvalue())
        if request.url.host == "commons.wikimedia.org":
            name = "cc-by-sa-3.0" if "Messi" in params["titles"] else "gfdl-edited"
            return httpx.Response(200, json=_json(FIXTURES / f"commons/{name}.json"))
        ids = set(params["ids"].split("|"))
        if ids <= {"Q615", "Q107365"}:
            reply = _json(FIXTURES / f"wikidata/{params['ids']}.json")
            if params["ids"] in self.no_photo:
                del reply["entities"][params["ids"]]["claims"]["P18"]
            claims = reply["entities"][params["ids"]]["claims"]
            if params["ids"] in self.positions:
                claims["P413"] = [
                    {
                        "mainsnak": {
                            "snaktype": "value",
                            "datavalue": {
                                "type": "wikibase-entityid",
                                "value": {"id": item},
                            },
                        },
                        "rank": "normal",
                    }
                    for item in self.positions[params["ids"]]
                ]
            for claim in claims.get("P54", []):
                value = claim["mainsnak"].get("datavalue", {}).get("value", {})
                if value.get("id") in self.open_teams:
                    claim.get("qualifiers", {}).pop("P582", None)
            return httpx.Response(200, json=reply)
        teams = next(t for t in self.teams if ids <= set(t["entities"]))
        return httpx.Response(200, json=teams)


def _json(path: Path) -> dict[str, Any]:
    body = json.loads(path.read_text(encoding="utf-8"))
    assert isinstance(body, dict)
    return body


def _grades(path: Path, messi_pace: int = 5) -> None:
    rows = ["[outfield.Q615]", f'pace = [{messi_pace}, "Invented"]']
    rows += [f'{name} = [4, "Invented"]' for name in OUTFIELD_RATINGS[1:]]
    rows += ["[goalkeeper.Q107365]", *(f'{n} = [4, "Invented"]' for n in KEEPER)]
    path.write_text("\n".join(rows) + "\n", encoding="utf-8")


def _run(
    tmp: Path,
    now: str = FIRST,
    net: FakeWikimedia | None = None,
    photos: str = "",
) -> tuple[str, ...]:
    if not (tmp / "players.toml").exists():
        _grades(tmp / "players.toml")
    (tmp / "overrides.toml").touch()
    (tmp / "photos.toml").write_text(photos, encoding="utf-8")
    fake = httpx.MockTransport(net or FakeWikimedia())
    with PoliteClient(tmp / "cache", transport=fake, sleep=lambda _: None) as client:
        return build.build(
            client,
            now=now,
            api_dir=tmp / "api/v1",
            grades_file=tmp / "players.toml",
            overrides_file=tmp / "overrides.toml",
            photos_file=tmp / "photos.toml",
            ids_file=tmp / "ids.toml",
        )


def _tree(root: Path) -> dict[str, bytes]:
    files = (p for p in sorted(root.rglob("*")) if p.is_file())
    return {p.relative_to(root).as_posix(): p.read_bytes() for p in files}


def test_a_build_writes_every_file_valid_and_sorted(tmp_path: Path) -> None:
    problems = _run(tmp_path)

    api = tmp_path / "api/v1"
    files = _tree(api)
    players = ["players/lionel-messi.json", "players/manuel-neuer.json"]
    lists = [f"{name}.json" for name in ("clubs", "credits", "index", "players")]
    assert set(files) == {*lists, *players, PHOTO}
    validate(api)
    for name in set(files) - {PHOTO}:
        assert files[name].decode() == _dump(_json(api / name)) + "\n", name
    index = _json(api / "index.json")
    assert (index["formulaVersion"], index["dataVersion"]) == (FORMULA_VERSION, 1)
    assert index["generateTime"] == FIRST
    assert [c["itemCount"] for c in index["collections"]] == [2, 1, 2]
    clubs = [c["name"] for c in _json(api / "clubs.json")["clubs"]]
    assert clubs == ["clubs/fc-bayern-munich", "clubs/inter-miami-cf"]
    assert _json(api / players[0])["club"] == "clubs/inter-miami-cf"
    [credit] = _json(api / "credits.json")["credits"]
    assert (credit["player"], credit["uri"]) == (
        "players/lionel-messi",
        "photos/lionel-messi.webp",
    )
    assert credit["attribution"]["licenseCode"] == "CC-BY-SA-3.0"
    assert "photo" not in _json(api / players[1])
    assert "Q107365: avatar, \"licence 'gfdl' is not allowed\"" in problems


def test_a_player_without_a_photo_asks_commons_nothing(tmp_path: Path) -> None:
    net = FakeWikimedia(no_photo=("Q107365",))

    _run(tmp_path, net=net)

    assert not any("Neuer" in asked for asked in net.asked)
    assert "photo" not in _json(tmp_path / "api/v1/players/manuel-neuer.json")
    assert (tmp_path / "api/v1" / PHOTO).is_file()


def test_an_avatar_choice_publishes_no_photo_and_asks_commons_nothing(
    tmp_path: Path,
) -> None:
    net = FakeWikimedia()

    _run(tmp_path, net=net, photos='Q615 = { photo = "avatar", reason = "Promo" }')

    assert not any("Messi" in asked for asked in net.asked)
    assert "photo" not in _json(tmp_path / "api/v1/players/lionel-messi.json")
    assert not (tmp_path / "api/v1" / PHOTO).exists()


def test_a_named_file_replaces_the_photo_and_is_licence_checked(
    tmp_path: Path,
) -> None:
    net = FakeWikimedia()
    choice = 'Q615 = { photo = "Chosen Messi.jpg", reason = "Clearer" }'

    _run(tmp_path, net=net, photos=choice)

    assert "File:Chosen Messi.jpg" in net.asked
    assert not any("File:Leo Messi" in asked for asked in net.asked)
    assert (tmp_path / "api/v1" / PHOTO).is_file()


def test_a_rerun_with_no_change_gives_identical_bytes(tmp_path: Path) -> None:
    _run(tmp_path)
    first = _tree(tmp_path / "api")

    _run(tmp_path, now=LATER)

    assert _tree(tmp_path / "api") == first


def test_a_change_moves_only_the_changed_times(tmp_path: Path) -> None:
    _run(tmp_path)
    _grades(tmp_path / "players.toml", messi_pace=1)

    _run(tmp_path, now=LATER)

    api = tmp_path / "api/v1"
    index = _json(api / "index.json")
    assert (index["dataVersion"], index["generateTime"]) == (2, LATER)
    assert _json(api / "players/lionel-messi.json")["updateTime"] == LATER
    assert _json(api / "players/manuel-neuer.json")["updateTime"] == FIRST
    assert {c["updateTime"] for c in _json(api / "clubs.json")["clubs"]} == {FIRST}


def _refuse(api_dir: Path) -> None:
    raise ValidationError("players.json $.players: invented")


def _cut(self: Path, target: Path) -> Path:
    """Fail the rename of the new folder into place, as a lost disk would."""
    if Path(target).name == "v1" and not self.name.endswith("-old"):
        raise OSError("the disk went away")
    return RENAME(self, target)


@pytest.mark.parametrize(
    ("net", "patch", "error"),
    [
        (FakeWikimedia(image=404), None, FetchError),  # A failed stage.
        (None, (build, "validate", _refuse), BuildError),  # A schema failure.
        (None, (Path, "rename", _cut), OSError),  # An interrupted swap.
    ],
)
def test_a_failure_keeps_the_old_output(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    net: FakeWikimedia | None,
    patch: tuple[object, str, object] | None,
    error: type[Exception],
) -> None:
    _run(tmp_path)
    before = _tree(tmp_path / "api")
    _grades(tmp_path / "players.toml", messi_pace=1)
    if patch:
        monkeypatch.setattr(*patch)

    with pytest.raises(error):
        _run(tmp_path, now=LATER, net=net)

    assert _tree(tmp_path / "api") == before


def test_an_empty_grades_file_fails_before_anything_is_written(tmp_path: Path) -> None:
    (tmp_path / "players.toml").write_text("", encoding="utf-8")
    net = FakeWikimedia()

    with pytest.raises(BuildError, match="no players"):
        _run(tmp_path, net=net)

    assert not (tmp_path / "api").exists()
    assert net.asked == []


def test_a_missing_team_code_fails_before_any_photo_is_fetched(tmp_path: Path) -> None:
    net = FakeWikimedia().without_codes()

    with pytest.raises(BuildError, match="needs one national team code"):
        _run(tmp_path, net=net)

    assert not any("File:" in a or "upload" in a for a in net.asked)
    assert not (tmp_path / "api").exists()
    assert not (tmp_path / "ids.toml").exists()


def test_registered_slugs_are_kept_and_a_retired_one_is_never_reused(
    tmp_path: Path,
) -> None:
    # Messi keeps a slug his name no longer gives, and Q1 left the set but
    # still holds the one Neuer's name would take.
    (tmp_path / "ids.toml").write_text(
        '[players]\nQ1 = "manuel-neuer"\nQ615 = "leo-messi"\n'
        '[clubs]\nQ16844931 = "miami"\n',
        encoding="utf-8",
    )

    _run(tmp_path)

    api = tmp_path / "api/v1"
    assert _json(api / "players/leo-messi.json")["club"] == "clubs/miami"
    assert (api / "players/manuel-neuer-2.json").is_file()
    ids = (tmp_path / "ids.toml").read_text(encoding="utf-8")
    assert 'Q1 = "manuel-neuer"\nQ107365 = "manuel-neuer-2"\nQ615 = "leo-messi"' in ids


def test_the_new_folder_is_world_readable_and_stale_ones_are_removed(
    tmp_path: Path,
) -> None:
    stale = tmp_path / "api/.v1-abandoned"
    stale.mkdir(parents=True)
    (stale / "half.json").write_text("{", encoding="utf-8")

    _run(tmp_path)

    assert not stale.exists()
    assert (tmp_path / "api/v1").stat().st_mode & 0o777 == 0o755


def test_a_failed_run_leaves_the_registry_alone(tmp_path: Path) -> None:
    ids = '[players]\nQ1 = "someone"\n\n[clubs]\n'
    (tmp_path / "ids.toml").write_text(ids, encoding="utf-8")

    with pytest.raises(FetchError):
        _run(tmp_path, net=FakeWikimedia(image=404))

    assert (tmp_path / "ids.toml").read_text(encoding="utf-8") == ids


def test_a_run_killed_between_the_renames_restores_the_last_good_copy(
    tmp_path: Path,
) -> None:
    _run(tmp_path)
    before = _tree(tmp_path / "api/v1")
    (tmp_path / "api/v1").rename(tmp_path / "api/.v1-abc-old")
    (tmp_path / "api/.v1-def").mkdir()

    with pytest.raises(FetchError):
        _run(tmp_path, now=LATER, net=FakeWikimedia(image=404))

    assert _tree(tmp_path / "api/v1") == before
    assert [p.name for p in (tmp_path / "api").iterdir()] == ["v1"]


def _relabel(net: FakeWikimedia, team: str, label: str, code: str | None) -> None:
    """Change one saved team entity: its English label and its FIFA code."""
    for entities in (t["entities"] for t in net.teams):
        if team in entities:
            entities[team]["labels"]["en"]["value"] = label
            if code:
                datavalue = {"type": "string", "value": code}
                snak = {"snaktype": "value", "datavalue": datavalue}
                entities[team]["claims"]["P3441"] = [
                    {"mainsnak": snak, "rank": "normal"}
                ]


def test_youth_spells_for_another_country_do_not_change_the_code(
    tmp_path: Path,
) -> None:
    net = FakeWikimedia()
    _relabel(net, "Q1187790", "Spain national under-20 football team", "ESP")
    _relabel(net, "Q316497", "France national under-20 football team", "FRA")

    _run(tmp_path, net=net)

    assert _json(tmp_path / "api/v1/players/lionel-messi.json")["nationalTeamCode"]


def test_the_current_senior_team_gives_the_code_and_the_others_are_dropped(
    tmp_path: Path,
) -> None:
    net = FakeWikimedia()
    _relabel(net, "Q1187790", "Spain national football team", "ESP")  # Ended 2005.

    dropped = _run(tmp_path, net=net)

    player = _json(tmp_path / "api/v1/players/lionel-messi.json")
    assert player["nationalTeamCode"] == "ARG"
    assert "Q615: dropped senior national team Spain national football team" in dropped


def test_two_current_senior_teams_fail_naming_the_player(tmp_path: Path) -> None:
    net = FakeWikimedia()
    net.open_teams = ["Q1187790", "Q79800"]
    _relabel(net, "Q1187790", "Spain national football team", "ESP")

    with pytest.raises(BuildError, match="Q615: can't tell"):
        _run(tmp_path, net=net)


def test_only_youth_spells_fail_and_every_failing_player_is_named_at_once(
    tmp_path: Path,
) -> None:
    net = FakeWikimedia()
    _relabel(net, "Q79800", "Argentina national under-21 football team", None)
    _relabel(net, "Q43310", "Germany national under-21 football team", None)

    with pytest.raises(BuildError) as error:
        _run(tmp_path, net=net)

    assert "Q615: found" in str(error.value)
    assert "Q107365: found" in str(error.value)
    assert not any("upload" in a for a in net.asked)


def test_a_specific_only_player_builds_with_the_mapped_position(
    tmp_path: Path,
) -> None:
    net = FakeWikimedia()
    net.positions = {"Q615": ["Q8025128"]}  # Wing half.

    _run(tmp_path, net=net)

    player = _json(tmp_path / "api/v1/players/lionel-messi.json")
    assert player["position"] == "MIDFIELDER"


def test_players_with_no_usable_position_are_named_at_once_before_any_download(
    tmp_path: Path,
) -> None:
    net = FakeWikimedia()
    net.positions = {"Q615": ["Q1"], "Q107365": ["Q11681748"]}  # Winger, no keeper.

    with pytest.raises(BuildError) as error:
        _run(tmp_path, net=net)

    assert "Q615: no Wikidata position" in str(error.value)
    assert "Q107365: no Wikidata position" in str(error.value)
    assert not any("upload" in a or "File:" in a for a in net.asked)
