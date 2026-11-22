"""The committed `data/api/v1` folder is valid and can fill a pack (T-0084)."""

import json
from collections import Counter
from pathlib import Path
from typing import Any

from soccer_cards_data.normalise import is_youth_side
from soccer_cards_data.validate import validate

API = Path(__file__).resolve().parents[2] / "api/v1"
PLAYER_COUNT = 64


def _json(rel: str) -> Any:
    return json.loads((API / rel).read_text(encoding="utf-8"))


def test_the_committed_folder_passes_the_schema() -> None:
    validate(API)


def test_it_holds_the_first_64_players() -> None:
    assert len(_json("players.json")["players"]) == PLAYER_COUNT
    assert len(list((API / "players").glob("*.json"))) == PLAYER_COUNT


def test_every_photo_has_a_credit_and_every_credit_a_file() -> None:
    credited = {c["uri"] for c in _json("credits.json")["credits"]}
    on_disk = {f"photos/{p.name}" for p in (API / "photos").glob("*.webp")}
    on_players = {
        p["photo"]["uri"] for p in _json("players.json")["players"] if "photo" in p
    }
    assert on_disk == credited
    assert on_players <= credited


def test_it_holds_63_photos_and_one_avatar() -> None:
    players = _json("players.json")["players"]
    avatars = [p["displayName"] for p in players if "photo" not in p]
    assert avatars == ["Peter Schmeichel"]
    assert len(list((API / "photos").glob("*.webp"))) == PLAYER_COUNT - 1


def test_the_tier_spread_lets_a_pack_be_drawn() -> None:
    tiers = Counter(p["tier"] for p in _json("players.json")["players"])
    assert tiers["BASE"] >= 8
    for tier in ("RARE", "LEGEND", "ICON"):
        assert tiers[tier] >= 1


def test_messi_and_ronaldo_are_icons() -> None:
    tiers = {p["name"]: p["tier"] for p in _json("players.json")["players"]}
    assert tiers["players/lionel-messi"] == "ICON"
    assert tiers["players/cristiano-ronaldo"] == "ICON"


def test_every_spells_club_is_in_clubs_and_spells_are_ordered() -> None:
    clubs = {c["name"] for c in _json("clubs.json")["clubs"]}
    with_spells = 0
    for path in (API / "players").glob("*.json"):
        spells = json.loads(path.read_text(encoding="utf-8")).get("careerSpells")
        if spells is None:
            continue
        with_spells += 1
        assert {s["club"] for s in spells} <= clubs, path.name
        starts = [s["startYear"] for s in spells]
        assert starts == sorted(starts), path.name
        assert all(s.get("endYear", s["startYear"]) >= s["startYear"] for s in spells)
    assert with_spells > 0


def test_no_two_clubs_share_a_display_name() -> None:
    names = [c["displayName"] for c in _json("clubs.json")["clubs"]]
    assert [n for n, count in Counter(names).items() if count > 1] == []


def test_no_reserve_or_academy_side_is_a_club() -> None:
    names = {c["displayName"] for c in _json("clubs.json")["clubs"]}
    assert not names & {
        "FC Barcelona Atlètic",
        "Australian Institute of Sport Football Program",
        "New South Wales Institute of Sport",
    }
    assert not [n for n in names if is_youth_side(n)]
