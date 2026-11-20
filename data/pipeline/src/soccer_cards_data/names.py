"""Make safe display names and stable slugs from Wikidata labels (ADR 0005 D2).

Wikidata labels are text anyone can edit. A label is used as a name only when
it is plain text under the schema's pattern, with no invisible or unassigned
characters, mostly not combining marks, single-spaced and short.
"""

import re
import unicodedata
from collections import Counter
from collections.abc import Mapping

from soccer_cards_data.commons import AUTHOR_PATTERN
from soccer_cards_data.wikidata import PlayerFacts

MAX_NAME_LENGTH = 60  # The longest label used as a player's or club's name.
MAX_SLUG_BASE = 50  # Leaves room for `-1976` and a `-2` counter inside 63.
MAX_MARK_SHARE = 3  # A label is refused when over 1 in 3 characters are marks.

_PLAIN = AUTHOR_PATTERN  # The schema's plain-text pattern, as `cardTitle` uses it.
# Format (invisible), private-use and unassigned characters.
_HIDDEN = frozenset({"Cf", "Co", "Cn"})
# Letters NFKD doesn't split into an ASCII letter and an accent.
_FOLD = str.maketrans(
    {"ø": "o", "ł": "l", "đ": "d", "ð": "d", chr(0x131): "i", "ß": "ss", "æ": "ae"}
    | {"œ": "oe", "þ": "th"}
)


class LabelError(ValueError):
    """A label can't be used as a name or a slug. The message starts with the Q-id."""


def is_plain(text: str) -> bool:
    """Return whether `text` is a plain, single-spaced name of at most 60 characters."""
    kinds = [unicodedata.category(ch) for ch in text]
    marks = sum(kind.startswith("M") for kind in kinds)
    return (
        len(text) <= MAX_NAME_LENGTH
        and text == " ".join(text.split())
        and bool(_PLAIN.fullmatch(text))
        and not _HIDDEN.intersection(kinds)
        and marks * MAX_MARK_SHARE <= len(text)
    )


def display_name(facts: PlayerFacts) -> str:
    """Return the player's label checked as a plain name, or raise LabelError."""
    return _checked(facts.qid, facts.label)


def club_name(qid: str, label: str | None) -> str:
    """Return a club's label checked as a plain name, or raise LabelError."""
    return _checked(qid, label)


def birth_year(facts: PlayerFacts) -> int | None:
    """Return the year of the player's birth date, or None when it isn't known."""
    year = (facts.birth_date or "")[:4]
    return int(year) if year.isdigit() else None


def slugify(text: str) -> str:
    """Return lower-case ASCII words joined by hyphens, starting with a letter.

    The result is empty when `text` has no ASCII letter after folding accents.
    """
    folded = unicodedata.normalize("NFKD", text.lower().translate(_FOLD))
    words = re.sub(r"[^a-z0-9]+", "-", folded.encode("ascii", "ignore").decode())
    return re.sub(r"^[^a-z]+", "", words)[:MAX_SLUG_BASE].strip("-")


def assign_slugs(
    names: Mapping[str, str], birth_years: Mapping[str, int] | None = None
) -> dict[str, str]:
    """Give each Q-id a slug from its name.

    A name only one entry has gives its slug as it is. Entries that share a
    name all add their birth year, as in `ronaldo-1976` (ADR 0005 D2). Only
    when a year is missing or the same, and for clubs, which have no years,
    does a counter (`-2`, `-3`) tell them apart, in Q-id order.

    Raises:
        LabelError: A name gives no slug. The message names the Q-id.
    """
    years = birth_years or {}
    bases: dict[str, str] = {}
    for qid, name in names.items():
        bases[qid] = slugify(name)
        if not bases[qid]:
            raise LabelError(f"{qid}: name {name!a} gives no slug")
    shared = Counter(bases.values())
    wanted = {
        qid: f"{base}-{years[qid]}" if shared[base] > 1 and qid in years else base
        for qid, base in bases.items()
    }
    slugs: dict[str, str] = {}
    for qid in sorted(names, key=lambda q: (wanted[q], len(q), q)):
        slug, n = wanted[qid], 2
        while slug in slugs.values():
            slug, n = f"{wanted[qid]}-{n}", n + 1
        slugs[qid] = slug
    return slugs


def _checked(qid: str, label: str | None) -> str:
    if label is None or not is_plain(label):
        raise LabelError(f"{qid}: label is missing or not plain text")
    return label
