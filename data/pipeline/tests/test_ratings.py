from dataclasses import fields, replace
from datetime import date

import pytest
from hypothesis import given
from hypothesis import strategies as st

from soccer_cards_data.ratings import (
    EXPERIENCE_BOUND,
    FACT_BOUND,
    FACT_INPUTS,
    FORMULA_VERSION,
    GOALKEEPER_RATINGS,
    OUTFIELD_RATINGS,
    Card,
    Facts,
    Position,
    RatingInputError,
    Tier,
    compute_card,
    tier_for,
)

AS_OF = date(2026, 11, 1)
GK, FW, MF = Position.GOALKEEPER, Position.FORWARD, Position.MIDFIELDER
VETERAN = Facts(400, 300, 100, 60, date(1988, 6, 24), AS_OF)
NO_MATCHES = Facts(club_appearances=0, club_goals=5, caps=0, international_goals=1)
UNBORN = Facts(birth_date=date(2026, 11, 2), as_of=AS_OF)
Case = tuple[Position, dict[str, int], Facts]


def _names(position: Position) -> tuple[str, ...]:
    return GOALKEEPER_RATINGS if position is GK else OUTFIELD_RATINGS


def _grades(position: Position) -> dict[str, int]:
    return dict.fromkeys(_names(position), 3)


@st.composite
def _cards(draw: st.DrawFn) -> Case:
    position = draw(st.sampled_from(Position))
    grades = {n: draw(st.integers(1, 5)) for n in _names(position)}
    count = st.none() | st.integers(0, 1500)
    born = draw(st.none() | st.dates(max_value=AS_OF))
    facts = Facts(draw(count), draw(count), draw(count), draw(count), born, AS_OF)
    return position, grades, facts


def _numbers(card: Card) -> list[int]:
    return [*card.ratings.values(), card.attack, card.defence, card.control]


@given(_cards())
def test_every_output_is_a_whole_number_from_1_to_99(case: Case) -> None:
    card = compute_card(*case)
    assert all(type(n) is int and 1 <= n <= 99 for n in [*_numbers(card), card.overall])
    assert tuple(card.ratings) == _names(case[0])
    assert FORMULA_VERSION >= 1


@given(_cards(), st.integers(0, 5))
def test_raising_one_grade_never_lowers_its_rating(case: Case, index: int) -> None:
    position, grades, facts = case
    name = _names(position)[index]
    raised = {**grades, name: min(5, grades[name] + 1)}
    before = compute_card(position, grades, facts)
    after = compute_card(position, raised, facts)
    assert after.ratings[name] >= before.ratings[name]


@given(_cards())
def test_adding_facts_never_moves_a_rating_past_the_bound(case: Case) -> None:
    bare, card = compute_card(*case[:2]), compute_card(*case)
    pairs = zip(_numbers(card), _numbers(bare), strict=True)
    assert all(abs(a - b) <= FACT_BOUND for a, b in pairs)
    assert abs(card.overall - bare.overall) <= FACT_BOUND + EXPERIENCE_BOUND


@given(_cards())
def test_the_same_inputs_give_the_same_outputs(case: Case) -> None:
    assert compute_card(*case) == compute_card(case[0], dict(case[1]), case[2])


@pytest.mark.parametrize("facts", [None, Facts(), NO_MATCHES])
def test_no_facts_or_zero_appearances_leave_the_grades_alone(
    facts: Facts | None,
) -> None:
    card = compute_card(FW, _grades(FW), facts)
    assert set(card.ratings.values()) == {compute_card(FW, _grades(FW)).ratings["pace"]}


def test_facts_move_only_the_ratings_the_adr_names() -> None:
    bare, card = compute_card(FW, _grades(FW)), compute_card(FW, _grades(FW), VETERAN)
    moved = {n for n in OUTFIELD_RATINGS if card.ratings[n] != bare.ratings[n]}
    assert moved == {"shooting", "pace", "physical"}
    assert card.ratings["shooting"] > bare.ratings["shooting"]
    keeper = compute_card(GK, _grades(GK), VETERAN)
    keeper_bare = compute_card(GK, _grades(GK))
    assert keeper.ratings == keeper_bare.ratings
    assert keeper.overall == keeper_bare.overall + EXPERIENCE_BOUND


# A full set of facts, and for each fact the same set with that one fact
# changed enough to move every number FACT_INPUTS lists for it.
SEASONED = Facts(200, 80, 50, 20, date(1990, 1, 1), AS_OF)
CHANGED = {
    "club_appearances": replace(SEASONED, club_appearances=1000),
    "club_goals": replace(SEASONED, club_goals=0),
    "caps": replace(SEASONED, caps=200),
    "international_goals": replace(SEASONED, international_goals=100),
    "birth_date": replace(SEASONED, birth_date=date(2000, 1, 1)),
    "as_of": replace(SEASONED, as_of=date(2016, 11, 1)),
}


def test_fact_inputs_names_every_fact() -> None:
    named = {fact for facts in FACT_INPUTS.values() for fact in facts}
    assert named == {f.name for f in fields(Facts)} == set(CHANGED)


@pytest.mark.parametrize("fact", CHANGED)
def test_each_fact_moves_only_what_fact_inputs_lists(fact: str) -> None:
    listed = {output for output, facts in FACT_INPUTS.items() if fact in facts}
    changed = CHANGED[fact]
    before, after = (compute_card(FW, _grades(FW), f) for f in (SEASONED, changed))
    moved = {n for n in OUTFIELD_RATINGS if after.ratings[n] != before.ratings[n]}
    assert moved == listed - {"overall"}
    # No fact moves a goalkeeper rating, so `overall` moves only through the
    # experience a fact feeds.
    keeper = [compute_card(GK, _grades(GK), f) for f in (SEASONED, changed)]
    assert keeper[0].ratings == keeper[1].ratings
    assert (keeper[0].overall != keeper[1].overall) == ("overall" in listed)


@pytest.mark.parametrize(
    ("overall", "tier"),
    [(83, Tier.BASE), (84, Tier.RARE), (87, Tier.RARE), (88, Tier.LEGEND)],
)
def test_tier_boundaries_follow_adr_0006_d4(overall: int, tier: Tier) -> None:
    assert tier_for(overall) is tier


def test_a_tier_override_replaces_the_rule() -> None:
    assert compute_card(MF, _grades(MF)).tier is Tier.BASE
    assert compute_card(MF, _grades(MF), tier_override=Tier.LEGEND).tier is Tier.LEGEND


@pytest.mark.parametrize(
    ("position", "grades", "facts", "field"),
    [
        (MF, {**_grades(MF), "passing": 0}, None, "grades.passing"),
        (MF, {**_grades(MF), "passing": 6}, None, "grades.passing"),
        (MF, {**_grades(MF), "pace": True}, None, "grades.pace"),
        (GK, _grades(FW), None, "grades"),
        (FW, _grades(GK), None, "grades"),
        (FW, _grades(FW), UNBORN, "facts.birth_date"),
        (FW, _grades(FW), Facts(caps=-1), "facts.caps"),
    ],
)
def test_a_refused_input_names_its_field(
    position: Position, grades: dict[str, int], facts: Facts | None, field: str
) -> None:
    with pytest.raises(RatingInputError, match=field) as error:
        compute_card(position, grades, facts)
    assert error.value.field == field
