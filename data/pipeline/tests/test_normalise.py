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
from soccer_cards_data.http import ReplyCheck
from soccer_cards_data.normalise import NormaliseError, SizedPhoto
from soccer_cards_data.photos import Photo
from soccer_cards_data.wikidata import PlayerFacts, fetch_player

FIXTURES = Path(__file__).parent / "fixtures" / "wikidata"
SCHEMA = Path(__file__).resolve().parents[3] / "packages/schema/schemas/v1"
PLAYER = json.loads((SCHEMA / "player.schema.json").read_text(encoding="utf-8"))
SUMMARY_DEFS = PLAYER["$defs"]
SUMMARY = SUMMARY_DEFS["playerSummary"]
MESSI = "https://www.wikidata.org/w/index.php?title=Q615&oldid=2568260945"
FILE = "https://commons.wikimedia.org/wiki/File:Invented.jpg"
IMAGE = "https://upload.wikimedia.org/wikipedia/commons/a/ab/Invented.jpg"
CREDIT = Publish(FILE, "Ina Vented", "CC-BY-SA-4.0", IMAGE)
PHOTO = SizedPhoto(CREDIT, Photo("photos/invented-slug.webp", 600, 800))


class SavedResponses:
    """Serves the T-0078 replies: the player's item, then its teams."""

    first = ""  # The player's id, set by the first request.

    def get_json(
        self, url: str, params: Mapping[str, str], *, check: ReplyCheck | None = None
    ) -> object:
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


def _assert_structure(record: normalise.PlayerRecord) -> None:
    """Check what the schema requires. Full JSON Schema validation is T-0083's."""
    player, summary = record.player, record.summary
    assert set(SUMMARY["required"]) <= set(summary) <= set(SUMMARY["properties"])
    assert "updateTime" in set(player) - set(summary) <= set(PLAYER["properties"])
    keeper = player["position"] == "GOALKEEPER"
    groups = {"goalkeeperRatings", "outfieldRatings"} & set(player)
    assert groups == {"goalkeeperRatings" if keeper else "outfieldRatings"}
    ratings, stats = player[groups.pop()], player["playStats"]
    assert isinstance(ratings, dict) and isinstance(stats, dict)
    assert set(stats) == set(SUMMARY_DEFS["playStats"]["required"])
    numbers = [*ratings.values(), *stats.values()]
    assert all(type(n) is int and 1 <= n <= 99 for n in numbers)
    assert re.fullmatch(SUMMARY["properties"]["name"]["pattern"], str(player["name"]))
    assert "null" not in json.dumps(player)


def test_outfield_player_from_saved_facts_is_schema_valid() -> None:
    record = _build(_facts())
    player: Any = record.player
    _assert_structure(record)
    assert player["name"] == "players/invented-slug"
    assert (player["displayName"], player["position"]) == ("Lionel Messi", "FORWARD")
    assert player["state"] == "ACTIVE"
    assert player["club"] == "clubs/inter-miami-cf"
    assert record.club_display_name == "Inter Miami CF"
    assert player["clubGoalCount"] == {
        "value": 6 + 474 + 22 + 68,  # Not FC Barcelona C, a reserve team.
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

    _assert_structure(record)
    assert "photo" not in player
    assert player["position"] == "GOALKEEPER"
    assert set(player["goalkeeperRatings"]) == set(GROUPS["goalkeeper"])
    assert player["clubGoalCount"]["value"] == 0  # Known, so present.
    summary = SUMMARY["properties"]
    assert set(record.summary) == set(player) - set(normalise.FULL_ONLY)
    assert not set(normalise.FULL_ONLY) & set(summary)


def test_same_input_gives_the_same_output() -> None:
    first, second = _build(_facts()), _build(_facts())
    assert json.dumps(vars(first)) == json.dumps(vars(second))  # Same bytes.


@pytest.mark.parametrize("tier", ["ICON", "BASE", "LEGEND"])
def test_override_sets_the_tier(tier: str) -> None:
    record = _build(_facts(), override=Override("Q615", tier, "A reason"))
    assert record.player["tier"] == record.summary["tier"] == tier
    _assert_structure(record)


def test_player_with_no_spells_is_retired_with_no_counts() -> None:
    record = _build(replace(_facts(), clubs=(), national_teams=()), photo=None)
    _assert_structure(record)
    assert record.player["state"] == "RETIRED"
    for key in ("club", "clubGoalCount", "nationalTeamGoalCount", "photo"):
        assert key not in record.player


@pytest.mark.parametrize(("label", "total"), [(None, None), ("Barca U19", 564)])
def test_unknown_count_voids_total_unless_youth(label: Any, total: Any) -> None:
    clubs = _facts().clubs
    second = clubs[1]  # FC Barcelona Atlètic: 6 of the 570 club goals.
    second = replace(second, goals=None, team_label=label or second.team_label)
    record: Any = _build(replace(_facts(), clubs=(clubs[0], second, *clubs[2:])))
    assert record.player.get("clubGoalCount", {}).get("value") == total
    _assert_structure(record)


def test_count_over_its_bound_is_reported_and_absent() -> None:
    senior = replace(_facts().national_teams[-1], goals=201)
    record = _build(replace(_facts(), national_teams=(senior,)))
    assert "nationalTeamGoalCount" not in record.player
    assert record.problems == ("Q615 Q79800: 201 goals is over 200, treated as absent",)


def test_unsafe_club_label_drops_the_club_and_is_reported() -> None:
    clubs = _facts().clubs
    miami = replace(clubs[-1], team_label="<a href=x>Club</a>")
    record = _build(replace(_facts(), clubs=(*clubs[:-1], miami)))
    assert "club" not in record.player
    assert record.player["state"] == "ACTIVE"
    assert record.problems == ("Q615 Q16844931: label is missing or not plain text",)


@pytest.mark.parametrize(
    ("changes", "message"),
    [
        ({"national_team_code": "ar"}, "national team code"),
        ({"update_time": "2026-11-21"}, "update time"),
        ({"entry": _grades("Q1", "outfield")}, "another player"),
        ({"override": Override("Q1", "ICON", "x")}, "another player"),
        ({"entry": _grades("Q615", "goalkeeper")}, "no Wikidata position"),
        ({"slug": "Not-A-Slug"}, "slug"),
        ({"photo": replace(PHOTO, file=Photo("photos/x.webp", 0, 9))}, "photo size"),
        ({"photo": replace(PHOTO, file=Photo("../x.webp", 9, 9))}, "photo path"),
        ({"facts": replace(_facts(), birth_date="2027-01-01")}, "facts.birth_date"),
        ({"facts": replace(_facts(), label="<b>Leo</b>")}, "label"),
        ({"facts": replace(_facts(), label="Leo\u202eMessi")}, "label"),
    ],
)
def test_refused_inputs_name_the_player(changes: dict[str, Any], message: str) -> None:
    facts = changes.pop("facts", _facts())
    with pytest.raises(NormaliseError, match=f"^Q615: .*{re.escape(message)}"):
        _build(facts, **changes)


@pytest.mark.parametrize(
    ("listed", "expected"),
    [
        (("Q11681748",), "FORWARD"),
        (("Q6008848",), "MIDFIELDER"),
        (("Q268258",), "DEFENDER"),
        (("Q8025128", "Q280658"), "FORWARD"),  # A basic position beats an earlier one.
    ],
)
def test_specific_positions_map_to_card_positions(
    listed: tuple[str, ...], expected: str
) -> None:
    record = _build(replace(_facts(), positions=listed))

    assert record.player["position"] == expected


def test_one_word_name_has_no_given_or_family_name() -> None:
    record = _build(replace(_facts(), label="Pelé"))
    assert record.player["displayName"] == "Pelé"
    assert not {"givenName", "familyName"} & set(record.player)
    _assert_structure(record)


YOUTH_LABELS = [
    "Rivertown Under-21s",
    "Rivertown under 19",
    "Rivertown U23",
    "RIVERTOWN U-18S",
    "Rivertown Juvenil A",
    "Rivertown Youth",
    "rivertown academy",
    "Rivertown Reserves",
    "Rivertown Reserve",
    "Rivertown B",
    "Rivertown b team",
    "Rivertown B-Team",
    "Rivertown C",
    "Rivertown II",
]
SENIOR_LABELS = [
    "Youthville Rovers",
    "Academical Rivertown",
    "Juvenilia FC",
    "Reservoir City",
    "Underhill United",
    "Union 23 FC",
    "U2 Rovers",
    "B36 Rivertown",
    "Rivertown Bees",
    "Rivertown Bulls FC",
    "Rivertown Cobras",
]


def _with_current_club(label: str, **changes: Any) -> normalise.PlayerRecord:
    """Add a newer current spell at an invented club to Messi's saved facts."""
    newest = replace(
        _facts().clubs[-1], team="Q999001", team_label=label, start="2026-01-01"
    )
    clubs = (*_facts().clubs, replace(newest, **changes))
    return _build(replace(_facts(), clubs=clubs))


@pytest.mark.parametrize("label", YOUTH_LABELS)
def test_youth_and_reserve_spells_are_left_out(label: str) -> None:
    record: Any = _with_current_club(label, goals=999, as_of="2019-05")
    assert record.club_display_name == "Inter Miami CF"  # The current club.
    assert record.player["clubGoalCount"] == {
        "value": 6 + 474 + 22 + 68,
        "sourceUri": MESSI,
        "retrieveDate": "2026-08-30",  # Not the youth spell's 2019-05-01.
    }
    _assert_structure(record)


@pytest.mark.parametrize("label", SENIOR_LABELS)
def test_senior_clubs_with_youth_letters_are_kept(label: str) -> None:
    record: Any = _with_current_club(label, goals=1, as_of="2019-05")
    assert record.club_display_name == label
    assert record.player["clubGoalCount"]["value"] == 6 + 474 + 22 + 68 + 1
    assert record.player["clubGoalCount"]["retrieveDate"] == "2019-05-01"


def test_youth_national_team_is_left_out() -> None:
    teams = _facts().national_teams
    youth = replace(teams[-1], team="Q999002", team_label="Rivertown national U21s")
    record: Any = _build(replace(_facts(), national_teams=(*teams, youth)))
    assert record.player["nationalTeamGoalCount"]["value"] == 126
    assert record.problems == ()


def _two_senior(old_end: str | None, new_end: str | None) -> PlayerFacts:
    """Q615 with an old senior team and a new one, both invented."""
    base = _facts().national_teams[-1]
    old = replace(
        base,
        team="Q999003",
        team_label="Rivertown national team",
        goals=5,
        appearances=9,
        end=old_end,
    )
    new = replace(base, goals=7, appearances=11, end=new_end)
    return replace(_facts(), national_teams=(old, new))


def test_current_senior_national_team_is_the_one_with_no_end_date() -> None:
    record: Any = _build(_two_senior("2021", None))
    assert record.player["nationalTeamGoalCount"]["value"] == 7
    assert record.problems == (
        "Q615: dropped senior national team Rivertown national team",
    )
    _assert_structure(record)


def test_current_senior_national_team_is_the_one_that_ended_last() -> None:
    record: Any = _build(_two_senior("2021", "2023"))
    assert record.player["nationalTeamGoalCount"]["value"] == 7
    assert len(record.problems) == 1


def test_two_senior_teams_without_an_end_date_fail_naming_the_player() -> None:
    with pytest.raises(normalise.NormaliseError, match="Q615: can't tell"):
        _build(_two_senior(None, None))


def test_two_senior_teams_ending_together_fail_naming_the_player() -> None:
    with pytest.raises(normalise.NormaliseError, match="Q615: can't tell"):
        _build(_two_senior("2021", "2021"))


def test_photo_record_holds_size_type_and_credit() -> None:
    record = _build(_facts())
    assert record.player["photo"] == record.summary["photo"]
    assert record.player["photo"] == {
        "uri": "photos/invented-slug.webp",
        "widthPx": 600,
        "heightPx": 800,
        "mimeType": "image/webp",
        "attribution": {
            "author": "Ina Vented",
            "licenseCode": "CC-BY-SA-4.0",
            "sourceUri": FILE,
        },
    }
