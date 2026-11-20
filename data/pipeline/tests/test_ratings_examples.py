"""Exact cards for invented players, so any change to the formula shows here.

The players are made up. Each example pins every number on its card. A
change to a constant, a weight, a threshold or a rounding rule changes at
least one of them, and then `FORMULA_VERSION` must change too.
"""

import hashlib
import json
from datetime import date

import pytest

from soccer_cards_data import ratings
from soccer_cards_data.ratings import (
    FORMULA_VERSION,
    GOALKEEPER_RATINGS,
    OUTFIELD_RATINGS,
    Card,
    Facts,
    Position,
    Tier,
    compute_card,
)

AS_OF = date(2026, 11, 1)
GK, DF, MF, FW = Position
PINNED_VERSION = 1
PINNED_FINGERPRINT = "9feb814327c60a5b"

# name: position, grades in group order, facts, the card's six ratings, attack,
# defence, control, overall, tier. Comments say which rule each one pins.
EXAMPLES = {
    # Shooting moves by exactly +0.5 and rounds half up. Pace is one age
    # point past its peak.
    "forward Tamsin Oakridge": (
        FW,
        (4, 5, 3, 4, 1, 3),
        Facts(318, 143, 42, 19, date(1995, 3, 14), AS_OF),
        (84, 96, 75, 85, 55, 75),
        (89, 66, 80, 85),
        Tier.RARE,
    ),
    # Defence is a weighted mean of exactly 76.5, which rounds up.
    "midfielder Ruari Vellacott": (
        MF,
        (3, 3, 5, 4, 3, 3),
        Facts(520, 61, 88, 9, date(1993, 9, 2), AS_OF),
        (73, 75, 95, 85, 75, 74),
        (79, 77, 87, 86),
        Tier.RARE,
    ),
    # At 39, age takes pace and physical down by the full fact bound of 3.
    "defender Ottilie Brannagh": (
        DF,
        (3, 1, 3, 2, 5, 4),
        Facts(415, 12, 30, 1, date(1987, 1, 20), AS_OF),
        (72, 55, 75, 65, 95, 82),
        (62, 87, 71, 85),
        Tier.RARE,
    ),
    # Facts move no goalkeeper rating. Experience of 5 is held to its bound
    # of 3, and that lifts `overall` from 85 to exactly 88.
    "goalkeeper Fenwick Albery": (
        GK,
        (4, 4, 3, 5, 2, 4),
        Facts(600, 0, 95, 0, date(1990, 7, 7), AS_OF),
        (85, 85, 75, 95, 65, 85),
        (73, 88, 79, 88),
        Tier.LEGEND,
    ),
    # No facts at all: every rating is its grade's base.
    "midfielder with no facts Joss Pemberly": (
        MF,
        (2, 3, 4, 3, 2, 3),
        None,
        (65, 75, 85, 75, 65, 75),
        (74, 70, 78, 75),
        Tier.BASE,
    ),
    # Overall 925 / 11 rounds down to exactly 84, the lowest RARE.
    "defender at RARE's edge Wren Castlebury": (
        DF,
        (1, 1, 3, 5, 5, 5),
        None,
        (55, 55, 75, 95, 95, 95),
        (65, 89, 83, 84),
        Tier.RARE,
    ),
    # Overall 965 / 11 rounds up to exactly 88, the lowest LEGEND.
    "defender at LEGEND's edge Idris Hallowmere": (
        DF,
        (1, 1, 5, 5, 5, 5),
        None,
        (55, 55, 95, 95, 95, 95),
        (67, 91, 91, 88),
        Tier.LEGEND,
    ),
}
Example = tuple[
    Position, tuple[int, ...], Facts | None, tuple[int, ...], tuple[int, ...], Tier
]


@pytest.mark.parametrize("example", EXAMPLES.values(), ids=EXAMPLES.keys())
def test_an_invented_player_gets_exactly_this_card(example: Example) -> None:
    position, grades, facts, numbers, (attack, defence, control, overall), tier = (
        example
    )
    names = GOALKEEPER_RATINGS if position is GK else OUTFIELD_RATINGS
    card = compute_card(position, dict(zip(names, grades, strict=True)), facts)
    expected = Card(
        ratings=dict(zip(names, numbers, strict=True)),
        attack=attack,
        defence=defence,
        control=control,
        overall=overall,
        tier=tier,
    )
    assert card == expected, (
        "This card changed. A formula change bumps FORMULA_VERSION and then "
        "updates the example."
    )


def _fingerprint() -> str:
    constants = {
        name: value
        for name, value in vars(ratings).items()
        if name.isupper() and name != "FORMULA_VERSION"
    }
    text = json.dumps(constants, sort_keys=True)
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def test_the_formula_constants_match_the_pinned_version() -> None:
    assert (FORMULA_VERSION, _fingerprint()) == (
        PINNED_VERSION,
        PINNED_FINGERPRINT,
    ), (
        "A constant in ratings.py changed. Bump FORMULA_VERSION, then update "
        "PINNED_VERSION, PINNED_FINGERPRINT and the example cards here."
    )
