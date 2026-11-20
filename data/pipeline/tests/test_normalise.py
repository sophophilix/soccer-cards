import json
import re
from collections.abc import Mapping
from dataclasses import replace
from functools import cache
from pathlib import Path
from typing import Any

import pytest

from soccer_cards_data import normalise
from soccer_cards_data.commons import Avatar, Publish
from soccer_cards_data.grades import GROUPS, GradeEntry, Override
from soccer_cards_data.normalise import NormaliseError, SizedPhoto
from soccer_cards_data.wikidata import PlayerFacts, fetch_player

FIXTURES = Path(__file__).parent / "fixtures" / "wikidata"
SCHEMAS = Path(__file__).resolve().parents[3] / "packages/schema/schemas/v1"
MESSI = "https://www.wikidata.org/w/index.php?title=Q615&oldid=2568260945"
FILE = "https://commons.wikimedia.org/wiki/File:Invented.jpg"
IMAGE = "https://upload.wikimedia.org/wikipedia/commons/a/ab/Invented.jpg"
PHOTO = SizedPhoto(Publish(FILE, "Ina Vented", "CC-BY-SA-4.0", IMAGE), 600, 800)


class SavedResponses:
    """Serves the T-0078 replies: the player's item, then its teams."""

    def __init__(self) -> None:
        self.first = ""

    def get_json(self, url: str, params: Mapping[str, str]) -> object:
        self.first = self.first or params["ids"]
        name = self.first if params["ids"] == self.first else f"{self.first}-teams"
        return json.loads((FIXTURES / f"{name}.json").read_text(encoding="utf-8"))


@cache
def _facts(qid: str = "Q615") -> PlayerFacts:
    return fetch_player(SavedResponses(), qid)


def _grades(qid: str, group: str) -> GradeEntry:
    names = GROUPS[group]
    return GradeEntry(qid, group, dict.fromkeys(names, 4), dict.fromkeys(names, "x"))


def _build(facts: PlayerFacts, **changes: Any) -> normalise.PlayerRecord:
    group = "goalkeeper" if facts.qid == "Q107365" else "outfield"
    args: dict[str, Any] = {
        "entry": _grades(facts.qid, group),
        "override": None,
        "photo": PHOTO,
        "slug": "invented-slug",
        "national_team_code": "ARG",
        "update_time": "2026-11-21T09:00:00Z",
    }
    return normalise.build_player(facts, **(args | changes))


@cache
def _schema(name: str) -> Any:
    return json.loads((SCHEMAS / name).read_text(encoding="utf-8"))


_KEYWORDS = {"$schema", "$id", "title", "description", "$comment", "$defs", "$ref"}
_KEYWORDS |= {"allOf", "type", "enum", "const", "pattern", "minLength", "maxLength"}
_KEYWORDS |= {"minimum", "maximum", "properties", "required", "dependentRequired"}
_KEYWORDS |= {"items", "if", "then", "else", "not"}
_TYPES: dict[str, type] = {"object": dict, "array": list, "string": str, "integer": int}


def _errors(value: Any, schema: Any, root: Any, at: str = "$") -> list[str]:
    """Check the keywords the v1 schemas use. T-0083 adds `jsonschema`."""
    assert set(schema) <= _KEYWORDS, f"unsupported: {set(schema) - _KEYWORDS}"
    errors: list[str] = []
    if "$ref" in schema:
        file, _, pointer = schema["$ref"].partition("#")
        root = _schema(file) if file else root
        target = root
        for part in pointer.strip("/").split("/"):
            target = target[part]
        errors += _errors(value, target, root, at)
    for sub in schema.get("allOf", []):
        errors += _errors(value, sub, root, at)
    kind = _TYPES.get(schema.get("type", ""), object)
    if not isinstance(value, kind) or (kind is int and isinstance(value, bool)):
        return [*errors, f"{at}: is not {schema['type']}"]
    if value not in schema.get("enum", [value]) or schema.get("const", value) != value:
        errors.append(f"{at}: {value!r} is not allowed")
    size = len(value) if isinstance(value, str) else 0
    if not schema.get("minLength", 0) <= size <= schema.get("maxLength", size):
        errors.append(f"{at}: wrong length")
    if isinstance(value, str) and not re.search(schema.get("pattern", ""), value):
        errors.append(f"{at}: {value!r} breaks the pattern")
    low, high = schema.get("minimum", value), schema.get("maximum", value)
    if isinstance(value, int) and not low <= value <= high:
        errors.append(f"{at}: {value} is out of range")
    if isinstance(value, dict):
        needed = set(schema.get("required", []))
        for key, more in schema.get("dependentRequired", {}).items():
            needed |= set(more) if key in value else set()
        errors += [f"{at}: lacks {key}" for key in sorted(needed - set(value))]
        for key, sub in schema.get("properties", {}).items():
            errors += (
                _errors(value[key], sub, root, f"{at}.{key}") if key in value else []
            )
    for i, item in enumerate(value if "items" in schema else []):
        errors += _errors(item, schema["items"], root, f"{at}[{i}]")
    if "if" in schema:
        branch = "else" if _errors(value, schema["if"], root, at) else "then"
        errors += _errors(value, schema.get(branch, {}), root, at)
    if "not" in schema and not _errors(value, schema["not"], root, at):
        errors.append(f"{at}: matches a schema it must not")
    return errors


def _assert_valid(record: normalise.PlayerRecord) -> None:
    player, listing = _schema("player.schema.json"), _schema("players.schema.json")
    errors = _errors(record.player, player, player)
    errors += _errors({"players": [record.summary]}, listing, listing)
    assert errors == []


def test_the_test_validator_reads_the_schema_files() -> None:
    schema = _schema("player.schema.json")
    for name in ("player.outfield.json", "player.goalkeeper.json"):
        example = json.loads((SCHEMAS / "examples" / name).read_text("utf-8"))
        assert _errors(example, schema, schema) == []
    broken = example | {"outfieldRatings": example["goalkeeperRatings"]}
    assert len(_errors(broken, schema, schema)) > 1


def test_outfield_player_from_saved_facts_is_schema_valid() -> None:
    record = _build(_facts())
    player: Any = record.player

    _assert_valid(record)
    assert (player["name"], player["displayName"]) == (
        "players/invented-slug",
        "Lionel Messi",
    )
    assert (player["position"], player["state"]) == ("FORWARD", "ACTIVE")
    assert player["club"] == "clubs/inter-miami-cf"
    assert record.club_display_name == "Inter Miami CF"
    assert player["clubGoalCount"] == {
        "value": 5 + 6 + 474 + 22 + 68,
        "sourceUri": MESSI,
        "retrieveDate": "2026-08-30",
    }
    assert player["nationalTeamGoalCount"]["value"] == 126  # Not the youth teams.
    assert player["photo"]["uri"] == "photos/invented-slug.webp"
    assert player["photo"]["attribution"]["sourceUri"] == FILE
    assert set(player["outfieldRatings"]) == set(GROUPS["outfield"])
    assert "givenName" not in player
    assert record.problems == ()


def test_goalkeeper_without_photo_has_keeper_ratings_and_no_photo() -> None:
    record = _build(_facts("Q107365"), photo=Avatar("licence is missing"))
    player: Any = record.player

    _assert_valid(record)
    assert "photo" not in player
    assert player["position"] == "GOALKEEPER"
    assert set(player["goalkeeperRatings"]) == set(GROUPS["goalkeeper"])
    assert player["clubGoalCount"]["value"] == 0  # Known, so present.
    summary = _schema("player.schema.json")["$defs"]["playerSummary"]["properties"]
    assert set(record.summary) == set(player) - set(normalise.FULL_ONLY)
    assert set(record.summary) <= set(summary)
    assert not set(normalise.FULL_ONLY) & set(summary)


def test_same_input_gives_the_same_output() -> None:
    first, second = _build(_facts()), _build(_facts())
    assert json.dumps(first.player) == json.dumps(second.player)
    assert first == second


@pytest.mark.parametrize("tier", ["ICON", "BASE", "LEGEND"])
def test_override_sets_the_tier(tier: str) -> None:
    record = _build(_facts(), override=Override("Q615", tier, "A reason"))
    assert record.player["tier"] == record.summary["tier"] == tier
    _assert_valid(record)


def test_player_with_no_spells_is_retired_with_no_counts() -> None:
    record = _build(replace(_facts(), clubs=(), national_teams=()), photo=None)

    _assert_valid(record)
    assert record.player["state"] == "RETIRED"
    for key in ("club", "clubGoalCount", "nationalTeamGoalCount", "photo"):
        assert key not in record.player


def test_one_unknown_count_makes_the_total_absent() -> None:
    clubs = _facts().clubs
    record = _build(
        replace(_facts(), clubs=(replace(clubs[0], goals=None), *clubs[1:]))
    )
    assert "clubGoalCount" not in record.player
    _assert_valid(record)


def test_count_over_its_bound_is_reported_and_absent() -> None:
    senior = replace(_facts().national_teams[-1], goals=201)
    record = _build(replace(_facts(), national_teams=(senior,)))

    assert "nationalTeamGoalCount" not in record.player
    assert record.problems == ("Q615 Q79800: 201 goals is over 200, treated as absent",)


@pytest.mark.parametrize(
    "label",
    [None, "", "<b>Leo</b>", "Leo‮Messi", " Leo", "Leo  Messi", "Leo\nM", "L" * 61],
)
def test_unsafe_label_is_refused_with_the_qid(label: str | None) -> None:
    with pytest.raises(NormaliseError, match=r"^Q615: label"):
        _build(replace(_facts(), label=label))


def test_unsafe_club_label_drops_the_club_and_is_reported() -> None:
    clubs = _facts().clubs
    miami = replace(clubs[-1], team_label="<a href=x>Club</a>")
    record = _build(replace(_facts(), clubs=(*clubs[:-1], miami)))

    assert "club" not in record.player
    assert record.player["state"] == "ACTIVE"
    assert record.problems == ("Q615 Q16844931: club label is not plain text",)


@pytest.mark.parametrize(
    ("changes", "message"),
    [
        ({"national_team_code": "ar"}, "national team code"),
        ({"update_time": "2026-11-21"}, "update time"),
        ({"entry": _grades("Q1", "outfield")}, "another player"),
        ({"override": Override("Q1", "ICON", "x")}, "another player"),
        ({"entry": _grades("Q615", "goalkeeper")}, "no Wikidata position"),
        ({"slug": "Not-A-Slug"}, "slug"),
        ({"photo": replace(PHOTO, width_px=0)}, "photo size"),
        ({"facts": replace(_facts(), birth_date="2027-01-01")}, "facts.birth_date"),
    ],
)
def test_refused_inputs_name_the_player(changes: dict[str, Any], message: str) -> None:
    facts = changes.pop("facts", _facts())
    with pytest.raises(NormaliseError, match=f"^Q615: .*{re.escape(message)}"):
        _build(facts, **changes)


def test_slugs_are_ascii_and_collide_only_with_a_number() -> None:
    names = {"Q10": "Ronaldo", "Q9": "Ronaldo", "Q11": "Ronaldo 2"}
    names |= {"Q12": "Martin Ødegaard", "Q13": "Pelé", "Q14": "İlkay Gündoğan"}
    assert normalise.assign_slugs(names) == {
        "Q9": "ronaldo",
        "Q10": "ronaldo-2",
        "Q11": "ronaldo-2-2",
        "Q12": "martin-odegaard",
        "Q13": "pele",
        "Q14": "ilkay-gundogan",
    }
    pattern = _schema("player.schema.json")["$defs"]["playerSummary"]
    long = normalise.assign_slugs({"Q1": "9 " + "a" * 99, "Q2": "a" * 99})
    for slug in long.values():
        assert re.fullmatch(pattern["properties"]["name"]["pattern"], f"players/{slug}")


def test_name_with_no_letters_has_no_slug() -> None:
    with pytest.raises(NormaliseError, match=r"^Q7: "):
        normalise.assign_slugs({"Q7": "梅西"})
