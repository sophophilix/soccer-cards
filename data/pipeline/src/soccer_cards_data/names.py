"""Make safe display names and stable slugs from Wikidata labels (ADR 0005 D2).

Wikidata labels are text anyone can edit. A label is used as a name only when
it is plain text under the schema's pattern, single-spaced and short.
"""

import re
import unicodedata
from collections.abc import Mapping

from soccer_cards_data.commons import AUTHOR_PATTERN
from soccer_cards_data.wikidata import PlayerFacts

MAX_NAME_LENGTH = 60  # The longest label used as a player's or club's name.
MAX_SLUG_BASE = 56  # Leaves room for a numeric suffix inside 63 characters.

_PLAIN = AUTHOR_PATTERN  # The schema's plain-text pattern, as `cardTitle` uses it.
# Letters NFKD doesn't split into an ASCII letter and an accent.
_FOLD = str.maketrans(
    {"ø": "o", "ł": "l", "đ": "d", "ð": "d", chr(0x131): "i", "ß": "ss", "æ": "ae"}
    | {"œ": "oe", "þ": "th"}
)


class LabelError(ValueError):
    """A label can't be used as a name or a slug. The message starts with the Q-id."""


def is_plain(text: str) -> bool:
    """Return whether `text` is a plain, single-spaced name of at most 60 characters."""
    single_spaced = text == " ".join(text.split())
    return len(text) <= MAX_NAME_LENGTH and single_spaced and bool(_PLAIN.match(text))


def display_name(facts: PlayerFacts) -> str:
    """Return the player's label checked as a plain name, or raise LabelError."""
    if facts.label is None or not is_plain(facts.label):
        raise LabelError(f"{facts.qid}: label is missing or not plain text")
    return facts.label


def slugify(text: str) -> str:
    """Return lower-case ASCII words joined by hyphens, starting with a letter.

    The result is empty when `text` has no ASCII letter after folding accents.
    """
    folded = unicodedata.normalize("NFKD", text.lower().translate(_FOLD))
    words = re.sub(r"[^a-z0-9]+", "-", folded.encode("ascii", "ignore").decode())
    return re.sub(r"^[^a-z]+", "", words)[:MAX_SLUG_BASE].strip("-")


def assign_slugs(names: Mapping[str, str]) -> dict[str, str]:
    """Give each Q-id a slug from its name, in Q-id order.

    A repeated slug gets `-2`, `-3` and on, so the same names always give the
    same slugs.

    Raises:
        LabelError: A name gives no slug. The message names the Q-id.
    """
    slugs: dict[str, str] = {}
    for qid in sorted(names, key=lambda q: (len(q), q)):
        base = slugify(names[qid])
        if not base:
            raise LabelError(f"{qid}: name {names[qid]!a} gives no slug")
        slug, n = base, 2
        while slug in slugs.values():
            slug, n = f"{base}-{n}", n + 1
        slugs[qid] = slug
    return slugs
