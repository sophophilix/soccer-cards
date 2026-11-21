"""The committed `data/api/v1` folder is valid and can fill a pack (T-0084)."""

import json
from collections import Counter
from pathlib import Path
from typing import Any

from soccer_cards_data.validate import validate

API = Path(__file__).resolve().parents[2] / "api/v1"
PLAYER_COUNT = 24


def _json(rel: str) -> Any:
    return json.loads((API / rel).read_text(encoding="utf-8"))


def test_the_committed_folder_passes_the_schema() -> None:
    validate(API)


def test_it_holds_the_first_24_players() -> None:
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


def test_it_holds_23_photos_and_one_avatar() -> None:
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
