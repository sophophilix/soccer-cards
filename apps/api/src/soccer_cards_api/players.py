"""The player resource and its read-only repository."""

import re
from typing import Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from soccer_cards_api.queries import ReadOnlyQueries

# ADR 0005 D2: lowercase letters, digits and hyphens, starting with a letter,
# 63 characters at most.
_SLUG = re.compile(r"[a-z][a-z0-9-]{0,62}")

Position = Literal["GOALKEEPER", "DEFENDER", "MIDFIELDER", "FORWARD"]
Tier = Literal["BASE", "RARE", "LEGEND", "ICON"]


def is_valid_player_id(player_id: str) -> bool:
    """Say whether `player_id` is a slug under ADR 0005 D2."""
    return _SLUG.fullmatch(player_id) is not None


class Player(BaseModel):
    """A player, as the API shows them."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    name: str
    display_name: str
    position: Position
    tier: Tier
    overall: int


class PlayerRepository:
    """Reads players."""

    def __init__(self, queries: ReadOnlyQueries) -> None:
        """Use `queries` for every read."""
        self._queries = queries

    async def get(self, player_id: str) -> Player | None:
        """Return the player with this id, or None."""
        row = await self._queries.select_one(
            "SELECT id, display_name, position, tier, overall "
            "FROM players WHERE id = ?",
            (player_id,),
        )
        if row is None:
            return None
        return Player(
            name=f"players/{row['id']}",
            display_name=row["display_name"],
            position=row["position"],
            tier=row["tier"],
            overall=row["overall"],
        )
