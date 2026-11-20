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
    birth_date=None,
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
    "Leo‮Messi",
    "Leo\u0000Messi",
    " Leo",
    "Leo ",
    "Leo  Messi",
    "Leo\nMessi",
    "Leo\tMessi",
    "L" * 61,
]


def test_plain_label_is_the_display_name() -> None:
    assert display_name(FACTS) == "Lionel Messi"
    assert display_name(replace(FACTS, label="Pelé")) == "Pelé"  # One word.
    assert display_name(replace(FACTS, label="L" * 60)) == "L" * 60


@pytest.mark.parametrize("label", BAD_LABELS)
def test_unsafe_label_is_refused_with_the_qid(label: str | None) -> None:
    with pytest.raises(LabelError, match=r"^Q615: label"):
        display_name(replace(FACTS, label=label))


def test_plain_check_uses_the_schema_pattern() -> None:
    assert re.fullmatch(CARD_TITLE_PATTERN, "Inter Miami CF")
    assert is_plain("Inter Miami CF")
    for label in BAD_LABELS[1:]:
        assert not is_plain(label or "")


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


def test_slugs_collide_only_with_a_number_in_qid_order() -> None:
    names = {"Q10": "Ronaldo", "Q9": "Ronaldo", "Q11": "Ronaldo 2", "Q12": "Pelé"}
    expected = {"Q9": "ronaldo", "Q10": "ronaldo-2", "Q11": "ronaldo-2-2"}
    assert assign_slugs(names) == expected | {"Q12": "pele"}
    assert assign_slugs(dict(reversed(names.items()))) == assign_slugs(names)


def test_long_names_give_slugs_inside_the_schema_limit() -> None:
    slugs = assign_slugs({"Q1": "9 " + "a" * 99, "Q2": "a" * 99})
    assert slugs == {"Q1": "a" * 56, "Q2": "a" * 56 + "-2"}
    for slug in slugs.values():
        assert re.fullmatch(NAME_PATTERN, f"players/{slug}")


def test_name_with_no_letters_has_no_slug() -> None:
    with pytest.raises(LabelError, match=r"^Q7: "):
        assign_slugs({"Q7": "梅西"})


@given(st.dictionaries(st.from_regex(r"Q[1-9][0-9]{0,6}", fullmatch=True), st.text()))
def test_every_slug_is_unique_and_fits_the_schema(names: dict[str, str]) -> None:
    try:
        slugs = assign_slugs(names)
    except LabelError:
        return
    assert len(set(slugs.values())) == len(names)
    for slug in slugs.values():
        assert re.fullmatch(NAME_PATTERN, f"players/{slug}")
