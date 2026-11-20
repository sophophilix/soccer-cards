"""Turn one player's facts, grades, override and photo into API records.

The normalise stage of the `game-data-api` skill (ADR 0005, ADR 0006 D3, D4).
It is pure: the same inputs give the same records. Wikidata labels are text
anyone can edit, so `names` checks a label before it names a player or club.
A count over its sanity bound is reported in `problems` and treated as absent.
"""

import re
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date

from soccer_cards_data import ratings
from soccer_cards_data.commons import Avatar, Publish
from soccer_cards_data.grades import GradeEntry, Override
from soccer_cards_data.names import LabelError, display_name, is_plain, slugify
from soccer_cards_data.photos import Photo
from soccer_cards_data.wikidata import PlayerFacts, Spell

Position = ratings.Position
# Wikidata's position items (P413). A player's other positions are ignored.
POSITIONS = {
    "Q201330": Position.GOALKEEPER,
    "Q336286": Position.DEFENDER,
    "Q193592": Position.MIDFIELDER,
    "Q280658": Position.FORWARD,
}
# The fields written to players/{id}.json but not to the summary in players.json.
FULL_ONLY = ("updateTime", "clubGoalCount", "nationalTeamGoalCount")
PLAY_STATS = ("attack", "defence", "control", "overall")
# Sanity bounds on one spell's appearances and goals. Above one is a data error.
CLUB_BOUNDS = (1500, 1000)
NATIONAL_BOUNDS = (300, 200)

_FIFA = re.compile(r"[A-Z]{3}")
_SLUG = re.compile(r"[a-z][a-z0-9-]{0,62}")
_PHOTO_URI = re.compile(r"photos/[A-Za-z0-9_-]+\.webp")
_MOMENT = re.compile(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ")
_YOUTH = re.compile(r"\bunder-?\d+\b|\bU-?\d\d\b", re.IGNORECASE)


class NormaliseError(ValueError):
    """A player can't become a record. The message starts with the Q-id."""


@dataclass(frozen=True)
class SizedPhoto:
    """A photo Commons allows, and the WebP file the pipeline wrote for it."""

    decision: Publish
    file: Photo


@dataclass(frozen=True)
class PlayerRecord:
    """A player's `players/{id}.json` body, its list summary and what was dropped."""

    player: dict[str, object]
    summary: dict[str, object]
    club_display_name: str | None
    problems: tuple[str, ...]


def build_player(
    facts: PlayerFacts,
    entry: GradeEntry,
    override: Override | None,
    photo: SizedPhoto | Avatar | None,
    *,
    slug: str,
    national_team_code: str,
    update_time: str,
) -> PlayerRecord:
    """Build one player's records, or raise NormaliseError naming the Q-id."""
    qid = facts.qid
    owners = {entry.qid, override.qid if override else qid}
    _require(owners == {qid}, qid, "grades or override belong to another player")
    _require(bool(_SLUG.fullmatch(slug)), qid, f"slug {slug!a} is not allowed")
    _require(bool(_FIFA.fullmatch(national_team_code)), qid, "bad national team code")
    _require(bool(_MOMENT.fullmatch(update_time)), qid, "update time is not RFC 3339")
    try:
        name = display_name(facts)
    except LabelError as exc:
        raise NormaliseError(str(exc)) from exc
    problems: list[str] = []
    # A team with no label can't be shown to be a senior team, so it counts as youth.
    senior = [
        s for s in facts.national_teams if not _YOUTH.search(s.team_label or "U21")
    ]
    if len({s.team for s in senior}) > 1:
        problems.append(f"{qid}: plays for more than one senior national team")
        senior = []
    club_counts = _totals(facts.clubs, CLUB_BOUNDS, qid, problems)
    caps, nation_goals = _totals(senior, NATIONAL_BOUNDS, qid, problems)
    position = _position(facts, entry)
    card_facts = ratings.Facts(
        *club_counts, caps, nation_goals, _day(facts.birth_date), _day(facts.as_of)
    )
    try:
        card = ratings.compute_card(position, entry.grades, card_facts)
    except ratings.RatingInputError as exc:
        raise NormaliseError(f"{qid}: {exc}") from exc
    keeper = position == Position.GOALKEEPER
    current = sorted((s for s in facts.clubs if s.end is None), key=_newest)
    club = current[-1].team_label if current else None
    if current and not (club and is_plain(club) and slugify(club)):
        problems.append(f"{qid} {current[-1].team}: club label is not plain text")
        club = None
    player: dict[str, object] = {
        "name": f"players/{slug}",
        "displayName": name,
        "state": "ACTIVE" if current else "RETIRED",
        "club": f"clubs/{slugify(club)}" if club else None,
        "nationalTeamCode": national_team_code,
        "position": position.value,
        # The override is applied after the formula, so ICON needs no tier rule.
        "tier": override.tier if override else card.tier.value,
        "goalkeeperRatings" if keeper else "outfieldRatings": dict(card.ratings),
        "playStats": {k: getattr(card, k) for k in PLAY_STATS},
        "photo": _photo(photo, qid),
        "updateTime": update_time,
        "clubGoalCount": _sourced(facts, facts.clubs, club_counts[1]),
        "nationalTeamGoalCount": _sourced(facts, senior, nation_goals),
    }
    player = {k: v for k, v in player.items() if v is not None}
    summary = {k: v for k, v in player.items() if k not in FULL_ONLY}
    return PlayerRecord(player, summary, club, tuple(problems))


def _require(ok: bool, qid: str, reason: str) -> None:
    if not ok:
        raise NormaliseError(f"{qid}: {reason}")


def _position(facts: PlayerFacts, entry: GradeEntry) -> Position:
    """Return the first Wikidata position that fits the grade group."""
    keeper = entry.group == "goalkeeper"
    for item in facts.positions:
        found = POSITIONS.get(item)
        if found is not None and (found == Position.GOALKEEPER) == keeper:
            return found
    raise NormaliseError(f"{facts.qid}: no Wikidata position fits the grades")


def _totals(
    spells: Sequence[Spell], bounds: tuple[int, int], qid: str, problems: list[str]
) -> tuple[int | None, int | None]:
    """Sum appearances and goals. One count unknown or over its bound voids a sum."""
    sums: list[int | None] = []
    for field, bound in zip(("appearances", "goals"), bounds, strict=True):
        values: list[int | None] = [getattr(s, field) for s in spells]
        for spell, value in zip(spells, values, strict=True):
            if value is not None and value > bound:
                problems.append(
                    f"{qid} {spell.team}: {value} {field} is over {bound}, "
                    "treated as absent"
                )
        known = [v for v in values if v is not None and v <= bound]
        sums.append(sum(known) if spells and len(known) == len(values) else None)
    return sums[0], sums[1]


def _newest(spell: Spell) -> tuple[str, str]:
    return (spell.start or "", spell.team)


def _sourced(
    facts: PlayerFacts, spells: Sequence[Spell], value: int | None
) -> dict[str, object] | None:
    """Wrap a total with its source and the oldest day it holds for."""
    if value is None:
        return None
    days = (s.as_of + "-01" * (2 - s.as_of.count("-")) for s in spells)
    return {"value": value, "sourceUri": facts.source, "retrieveDate": min(days)}


def _day(text: str | None) -> date | None:
    try:
        return date.fromisoformat(text) if text and len(text) == 10 else None
    except ValueError:
        return None


def _photo(photo: SizedPhoto | Avatar | None, qid: str) -> dict[str, object] | None:
    if not isinstance(photo, SizedPhoto):
        return None
    file, credit = photo.file, photo.decision
    _require(bool(_PHOTO_URI.fullmatch(file.uri)), qid, "photo path is not allowed")
    _require(min(file.width_px, file.height_px) > 0, qid, "photo size is not positive")
    attribution = {"author": credit.author, "licenseCode": credit.license_code}
    return {
        "uri": file.uri,
        "widthPx": file.width_px,
        "heightPx": file.height_px,
        "mimeType": "image/webp",
        "attribution": attribution | {"sourceUri": credit.source_uri},
    }
