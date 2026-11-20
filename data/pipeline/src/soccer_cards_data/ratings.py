"""Turn a player's skill grades and facts into the numbers on a card.

This is the formula of ADR 0006 D3 and the tier rule of D4. It is pure: the
same inputs always give the same card. Grades carry the judgement. Facts only
nudge the ratings that `FACT_INPUTS` names, each by at most a fixed bound, and
a missing fact moves nothing.
"""

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import date
from enum import StrEnum
from operator import mul

FORMULA_VERSION = 1
"""Raise by one whenever a constant or a rule below changes."""


class Position(StrEnum):
    """Where the player plays, as the schema's `position` enum spells it."""

    GOALKEEPER = "GOALKEEPER"
    DEFENDER = "DEFENDER"
    MIDFIELDER = "MIDFIELDER"
    FORWARD = "FORWARD"


class Tier(StrEnum):
    """The tiers ADR 0006 D4 assigns. `ICON` needs its own decision."""

    BASE = "BASE"
    RARE = "RARE"
    LEGEND = "LEGEND"


# The six ratings of each group, in the schema's order (ADR 0005 D6).
OUTFIELD_RATINGS = ("pace", "shooting", "passing", "dribbling", "defending", "physical")
GOALKEEPER_RATINGS = (
    "diving",
    "handling",
    "kicking",
    "reflexes",
    "speed",
    "positioning",
)

# Which facts feed which number. Nothing else moves with a fact.
FACT_INPUTS: Mapping[str, tuple[str, ...]] = {
    "shooting": ("club_goals", "club_appearances", "international_goals", "caps"),
    "pace": ("birth_date", "as_of"),
    "physical": ("birth_date", "as_of"),
    "overall": ("club_appearances", "caps"),
}

MIN_GRADE = 1  # The lowest grade a grade file may hold.
MAX_GRADE = 5  # The highest grade a grade file may hold.
GRADE_1_BASE = 55  # The rating a grade of 1 starts from.
GRADE_STEP = 10  # How much each grade above 1 adds, so grade 5 starts at 95.
MIN_RATING = 1  # The lowest number a card may show.
MAX_RATING = 99  # The highest number a card may show.

FACT_BOUND = 3  # The most that facts move any one of the six ratings, up or down.
EXPERIENCE_BOUND = 3  # The most that appearances and caps raise `overall`.

MIN_GOAL_RATE_APPEARANCES = 20  # Fewer matches than this say nothing about scoring.
# Goals per 100 matches that leave shooting unchanged, by position.
EXPECTED_GOALS_PER_100 = {
    Position.FORWARD: 40,
    Position.MIDFIELDER: 15,
    Position.DEFENDER: 5,
}
# Each 10 goals per 100 matches above or below that rate moves shooting by 1.
GOALS_PER_100_PER_POINT = 10

PACE_PEAK_AGE = 28  # Pace starts to fall after this age.
PHYSICAL_PEAK_AGE = 31  # Physical starts to fall after this age.
YEARS_PER_AGE_POINT = 2  # Each 2 years past the peak take 1 point off.

CAP_WEIGHT = 3  # One national team match counts as this many club matches.
MATCHES_PER_EXPERIENCE_POINT = 150  # Each 150 weighted matches add 1 to `overall`.

# Weights of the six ratings, in group order, for each play stat. Shared by
# every outfield position.
OUTFIELD_STAT_WEIGHTS = {
    "attack": (2, 5, 1, 2, 0, 0),
    "defence": (1, 0, 1, 0, 5, 3),
    "control": (1, 0, 4, 4, 0, 1),
}
GOALKEEPER_STAT_WEIGHTS = {
    "attack": (0, 0, 4, 0, 1, 0),
    "defence": (3, 2, 0, 3, 0, 2),
    "control": (0, 3, 3, 0, 1, 1),
}
# Weights of the six ratings for `overall`, by position.
OVERALL_WEIGHTS = {
    Position.FORWARD: (2, 3, 1, 2, 1, 1),
    Position.MIDFIELDER: (1, 1, 3, 2, 2, 1),
    Position.DEFENDER: (2, 0, 2, 1, 4, 2),
    Position.GOALKEEPER: (3, 2, 1, 3, 1, 3),
}

RARE_FROM = 84  # The lowest `overall` of a RARE card (ADR 0006 D4).
LEGEND_FROM = 88  # The lowest `overall` of a LEGEND card (ADR 0006 D4).


class RatingInputError(ValueError):
    """An input the formula refuses. `field` names the input at fault."""

    def __init__(self, field: str, message: str) -> None:
        """Keep the field name and put it at the start of the message."""
        super().__init__(f"{field}: {message}")
        self.field = field


@dataclass(frozen=True)
class Facts:
    """The facts the formula may use. A fact that isn't known is None."""

    club_appearances: int | None = None
    club_goals: int | None = None
    caps: int | None = None
    international_goals: int | None = None
    birth_date: date | None = None
    as_of: date | None = None


@dataclass(frozen=True)
class Card:
    """The numbers on a card, named as the schema names them."""

    ratings: dict[str, int]
    attack: int
    defence: int
    control: int
    overall: int
    tier: Tier


def tier_for(overall: int, override: Tier | None = None) -> Tier:
    """Return the tier for `overall`, or `override` when the lead set one."""
    if override is not None:
        return override
    if overall >= LEGEND_FROM:
        return Tier.LEGEND
    return Tier.RARE if overall >= RARE_FROM else Tier.BASE


def compute_card(
    position: Position,
    grades: Mapping[str, int],
    facts: Facts | None = None,
    tier_override: Tier | None = None,
) -> Card:
    """Compute a card from a grade of 1 to 5 for each rating of the position's group.

    `facts`, or any field of it, may be None and then moves nothing. A
    `tier_override` from the lead's override file is used as given.

    Raises:
        RatingInputError: If a grade or fact is refused. `field` names it.
    """
    keeper = position == Position.GOALKEEPER
    names = GOALKEEPER_RATINGS if keeper else OUTFIELD_RATINGS
    _check_grades("goalkeeper" if keeper else "outfield", names, grades)
    facts = facts or Facts()
    age = _age(facts)
    moves = {
        "shooting": _shooting_move(position, facts),
        "pace": _age_move(age, PACE_PEAK_AGE),
        "physical": _age_move(age, PHYSICAL_PEAK_AGE),
    }
    base = {n: GRADE_1_BASE + GRADE_STEP * (grades[n] - MIN_GRADE) for n in names}
    ratings = {
        n: _clamp(base[n] + _clamp(moves.get(n, 0), -FACT_BOUND, FACT_BOUND))
        for n in names
    }
    values = tuple(ratings.values())
    stats = GOALKEEPER_STAT_WEIGHTS if keeper else OUTFIELD_STAT_WEIGHTS
    experience = _clamp(_experience_move(facts), 0, EXPERIENCE_BOUND)
    overall = _clamp(_weighted(values, OVERALL_WEIGHTS[position]) + experience)
    return Card(
        ratings=ratings,
        attack=_clamp(_weighted(values, stats["attack"])),
        defence=_clamp(_weighted(values, stats["defence"])),
        control=_clamp(_weighted(values, stats["control"])),
        overall=overall,
        tier=tier_for(overall, tier_override),
    )


def _check_grades(
    group: str, names: tuple[str, ...], grades: Mapping[str, int]
) -> None:
    if set(grades) != set(names):
        raise RatingInputError("grades", f"this position needs the {group} grades")
    for name in names:
        grade = grades[name]
        if type(grade) is not int or not MIN_GRADE <= grade <= MAX_GRADE:
            raise RatingInputError(
                f"grades.{name}",
                f"must be a whole number from {MIN_GRADE} to {MAX_GRADE}",
            )


def _age(facts: Facts) -> int | None:
    for field in ("club_appearances", "club_goals", "caps", "international_goals"):
        count = getattr(facts, field)
        if count is not None and (type(count) is not int or count < 0):
            raise RatingInputError(f"facts.{field}", "must be a whole number from 0")
    born, as_of = facts.birth_date, facts.as_of
    if born is None or as_of is None:
        return None
    if born > as_of:
        raise RatingInputError("facts.birth_date", "is after facts.as_of")
    return as_of.year - born.year - ((as_of.month, as_of.day) < (born.month, born.day))


def _shooting_move(position: Position, facts: Facts) -> int:
    expected = EXPECTED_GOALS_PER_100.get(position)
    pairs = (
        (facts.club_goals, facts.club_appearances),
        (facts.international_goals, facts.caps),
    )
    known = [(g, a) for g, a in pairs if g is not None and a is not None]
    matches = sum(a for _, a in known)
    if expected is None or matches < MIN_GOAL_RATE_APPEARANCES:
        return 0
    goals = sum(g for g, _ in known)
    # (goals per 100 matches - expected) / GOALS_PER_100_PER_POINT, kept exact.
    return _round(100 * goals - expected * matches, matches * GOALS_PER_100_PER_POINT)


def _age_move(age: int | None, peak: int) -> int:
    if age is None or age <= peak:
        return 0
    return -((age - peak) // YEARS_PER_AGE_POINT)


def _experience_move(facts: Facts) -> int:
    matches = (facts.club_appearances or 0) + CAP_WEIGHT * (facts.caps or 0)
    return matches // MATCHES_PER_EXPERIENCE_POINT


def _weighted(values: tuple[int, ...], weights: tuple[int, ...]) -> int:
    return _round(sum(map(mul, values, weights)), sum(weights))


def _round(numerator: int, denominator: int) -> int:
    """Round numerator / denominator half up, in whole numbers, with no float."""
    return (2 * numerator + denominator) // (2 * denominator)


def _clamp(value: int, low: int = MIN_RATING, high: int = MAX_RATING) -> int:
    return max(low, min(high, value))
