import json
import re
from dataclasses import replace
from pathlib import Path

import pytest
from hypothesis import given
from hypothesis import strategies as st

from soccer_cards_data.names import (
    LabelError,
    assign_slugs,
    birth_year,
    club_name,
    display_name,
    is_plain,
    slugify,
)
from soccer_cards_data.wikidata import PlayerFacts

SCHEMA = Path(__file__).resolve().parents[3] / "packages/schema/schemas/v1"
_PROPERTIES = json.loads((SCHEMA / "player.schema.json").read_text("utf-8"))["$defs"][
    "playerSummary"
]["properties"]
NAME_PATTERN = _PROPERTIES["name"]["pattern"]
CARD_TITLE_PATTERN = _PROPERTIES["cardTitle"]["pattern"]
FACTS = PlayerFacts(
    qid="Q615",
    label="Lionel Messi",
    birth_date="1987-06-24",
    positions=(),
    clubs=(),
    national_teams=(),
    honours=(),
    source="https://www.wikidata.org/w/index.php?title=Q615&oldid=1",
    as_of="2026-11-12",
    skipped=(),
)
BAD_LABELS = [
    None,
    "",
    "<b>Leo</b>",
    "Leo\u202eMessi",  # Right-to-left override.
    "Leo\u0000Messi",
    " Leo",
    "Leo ",
    "Leo  Messi",
    "Leo\nMessi",
    "Leo\tMessi",
    "L" * 61,
    # Invisible format characters (Cf).
    "Leo\u200bMessi",  # Zero-width space.
    "Leo\u200eMessi",  # Left-to-right mark.
    "Leo\u200fMessi",  # Right-to-left mark.
    "Leo\u061cMessi",  # Arabic letter mark.
    "Leo\u2060Messi",  # Word joiner.
    "Leo\ufeffMessi",  # Zero-width no-break space.
    "Leo\u00adMessi",  # Soft hyphen.
    "Leo\U000e0041Messi",  # Tag Latin capital A.
    "Leo\U000e007f",  # Cancel tag.
    "Leo\ue000Messi",  # Private use (Co).
    "Leo\u0378Messi",  # Unassigned (Cn).
    # Mostly combining marks.
    "Le\u0301\u0301",
    "Z\u0336\u0337\u0338a",
]


def test_plain_label_is_the_display_name() -> None:
    assert display_name(FACTS) == "Lionel Messi"
    assert display_name(replace(FACTS, label="Pelé")) == "Pelé"  # One word.
    assert display_name(replace(FACTS, label="Pele\u0301")) == "Pele\u0301"
    assert display_name(replace(FACTS, label="L" * 60)) == "L" * 60


@pytest.mark.parametrize("label", BAD_LABELS)
def test_unsafe_label_is_refused_with_the_qid(label: str | None) -> None:
    with pytest.raises(LabelError, match=r"^Q615: label"):
        display_name(replace(FACTS, label=label))


@pytest.mark.parametrize("label", BAD_LABELS)
def test_unsafe_club_label_is_refused_with_the_club_qid(label: str | None) -> None:
    with pytest.raises(LabelError, match=r"^Q16844931: label"):
        club_name("Q16844931", label)


def test_plain_club_label_is_the_club_name() -> None:
    assert club_name("Q16844931", "Inter Miami CF") == "Inter Miami CF"
    assert club_name("Q8682", "Real Madrid CF") == "Real Madrid CF"


def test_plain_check_uses_the_schema_pattern() -> None:
    assert re.fullmatch(CARD_TITLE_PATTERN, "Inter Miami CF")
    assert is_plain("Inter Miami CF")
    for label in BAD_LABELS[1:]:
        assert not is_plain(label or "")


@pytest.mark.parametrize(
    ("born", "year"), [("1987-06-24", 1987), ("1976", 1976), (None, None)]
)
def test_birth_year_is_read_from_the_birth_date(
    born: str | None, year: int | None
) -> None:
    assert birth_year(replace(FACTS, birth_date=born)) == year


@pytest.mark.parametrize(
    ("name", "slug"),
    [
        ("Pelé", "pele"),
        ("Martin Ødegaard", "martin-odegaard"),
        ("İlkay Gündoğan", "ilkay-gundogan"),
        ("Thomas Müller", "thomas-muller"),
        ("Inter Miami CF", "inter-miami-cf"),
        ("1. FC Köln", "fc-koln"),
        ("Robert Lewandowski", "robert-lewandowski"),
        ("梅西", ""),
    ],
)
def test_slugify_folds_to_ascii_words(name: str, slug: str) -> None:
    assert slugify(name) == slug


def test_people_who_share_a_name_get_their_birth_year() -> None:
    names = {"Q529207": "Ronaldo", "Q11": "Ronaldo", "Q12": "Pelé"}
    years = {"Q529207": 1976, "Q11": 1990, "Q12": 1940}
    slugs = assign_slugs(names, years)
    assert slugs == {"Q529207": "ronaldo-1976", "Q11": "ronaldo-1990", "Q12": "pele"}
    assert assign_slugs(dict(reversed(names.items())), years) == slugs


def test_adding_a_player_keeps_the_slugs_of_players_with_years() -> None:
    names = {"Q529207": "Ronaldo", "Q11": "Ronaldo", "Q12": "Pelé"}
    years = {"Q529207": 1976, "Q11": 1990, "Q12": 1940}
    before = assign_slugs(names, years)
    after = assign_slugs(names | {"Q5": "Ronaldo"}, years | {"Q5": 1960})
    assert after == before | {"Q5": "ronaldo-1960"}


def test_a_counter_is_used_only_without_a_distinct_year() -> None:
    names = {"Q10": "Ronaldo", "Q9": "Ronaldo", "Q11": "Ronaldo", "Q12": "Ronaldo"}
    slugs = assign_slugs(names, {"Q11": 1980, "Q12": 1980})
    assert slugs == {
        "Q9": "ronaldo",
        "Q10": "ronaldo-2",
        "Q11": "ronaldo-1980",
        "Q12": "ronaldo-1980-2",
    }


def test_clubs_that_share_a_name_get_a_counter() -> None:
    clubs = {"Q10": "Rangers FC", "Q9": "Rangers FC", "Q11": "Rangers FC 2"}
    expected = {"Q9": "rangers-fc", "Q10": "rangers-fc-2", "Q11": "rangers-fc-2-2"}
    assert assign_slugs(clubs) == expected


def test_long_names_give_slugs_inside_the_schema_limit() -> None:
    slugs = assign_slugs({"Q1": "9 " + "a" * 99, "Q2": "a" * 99, "Q3": "a" * 70})
    assert slugs["Q1"] == "a" * 50
    slugs |= assign_slugs({"Q1": "a" * 99, "Q2": "a" * 99}, {"Q1": 1999, "Q2": 1999})
    for slug in slugs.values():
        assert re.fullmatch(NAME_PATTERN, f"players/{slug}")


def test_name_with_no_letters_has_no_slug() -> None:
    with pytest.raises(LabelError, match=r"^Q7: "):
        assign_slugs({"Q7": "梅西"})


@given(
    st.dictionaries(
        st.from_regex(r"Q[1-9][0-9]{0,6}", fullmatch=True),
        st.tuples(st.text(), st.none() | st.integers(1850, 2020)),
    )
)
def test_every_slug_is_unique_and_fits_the_schema(
    people: dict[str, tuple[str, int | None]],
) -> None:
    names = {qid: name for qid, (name, _) in people.items()}
    years = {qid: year for qid, (_, year) in people.items() if year is not None}
    try:
        slugs = assign_slugs(names, years)
    except LabelError:
        return
    assert len(set(slugs.values())) == len(names)
    for slug in slugs.values():
        assert re.fullmatch(NAME_PATTERN, f"players/{slug}")


@pytest.mark.parametrize(
    "label",
    [
        "\u0391rda G\u00fcler",  # Greek capital alpha before Latin letters.
        "Lionel Mess\u03b9",  # Greek iota at the end.
        "Lionel Messi".replace("e", "\u0435"),  # Cyrillic e inside a Latin name.
        "Real \u041cadrid",  # Cyrillic capital Em.
    ],
)
def test_label_mixing_writing_systems_is_refused_with_the_qid(label: str) -> None:
    with pytest.raises(LabelError, match=r"^Q615: label mixes writing systems"):
        display_name(replace(FACTS, label=label))
    with pytest.raises(LabelError, match=r"^Q8682: label mixes writing systems"):
        club_name("Q8682", label)


@pytest.mark.parametrize(
    "label",
    [
        "Arda G\u00fcler",
        "\u00d8degaard",
        "\u0141ukasz",
        "Mbapp\u00e9",
        "N'Golo Kant\u00e9",
        "W.F.C.",
        "Jean-Pierre",
        "\u039b\u03b9\u03bf\u03bd\u03b5\u03bb \u039c\u03ad\u03c3\u03c3\u03b9",
        "\u041c\u0435\u0441\u0441\u0438",  # Cyrillic only.
    ],
)
def test_label_in_one_writing_system_is_accepted(label: str) -> None:
    assert display_name(replace(FACTS, label=label)) == label
