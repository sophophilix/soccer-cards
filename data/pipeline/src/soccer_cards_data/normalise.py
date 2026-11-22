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
from soccer_cards_data.names import LabelError, assign_slugs, club_name, display_name
from soccer_cards_data.photos import Photo
from soccer_cards_data.wikidata import PlayerFacts, Spell

Position = ratings.Position
# Wikidata's position items (P413) for the four card positions.
POSITIONS = {
    "Q201330": Position.GOALKEEPER,
    "Q336286": Position.DEFENDER,
    "Q193592": Position.MIDFIELDER,
    "Q280658": Position.FORWARD,
}
# Specific positions, used only when a player lists none of the four above.
SPECIFIC_POSITIONS = {
    "Q11681748": Position.FORWARD,  # winger
    "Q9731197": Position.FORWARD,  # centre-forward
    "Q1642283": Position.FORWARD,  # second striker
    "Q1201458": Position.MIDFIELDER,  # playmaker
    "Q90326494": Position.MIDFIELDER,  # attacking midfielder
    "Q18691898": Position.MIDFIELDER,  # defensive midfielder
    "Q6008848": Position.MIDFIELDER,  # central midfielder
    "Q8025128": Position.MIDFIELDER,  # wing half
    "Q1109563": Position.MIDFIELDER,  # centerhalf
    "Q268258": Position.DEFENDER,  # centre-back
    "Q90173132": Position.DEFENDER,  # full-back
    "Q1489923": Position.DEFENDER,  # sweeper
}
# The fields written to players/{id}.json but not to the summary in players.json.
FULL_ONLY = (
    "updateTime",
    "clubGoalCount",
    "nationalTeamGoalCount",
    "careerSpells",
)
PLAY_STATS = ("attack", "defence", "control", "overall")
# Sanity bounds on one spell's appearances and goals. Above one is a data error.
CLUB_BOUNDS = (1500, 1000)
NATIONAL_BOUNDS = (300, 200)

_FIFA = re.compile(r"[A-Z]{3}")
_SLUG = re.compile(r"[a-z][a-z0-9-]{0,62}")
_PHOTO_URI = re.compile(r"photos/[A-Za-z0-9_-]+\.webp")
_MOMENT = re.compile(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ")
# Youth and reserve teams: "Under-21s", "U23", "Juvenil A", "Youth", "Academy",
# "Reserves", "B team", and a last word of B, C, II or III ("FC Schalke 04 II").
# Whole words only, so "Youthville", "Academical" and "B36" stay senior.
_YOUTH = re.compile(
    r"\b(?:under[- ]?\d{1,2}|u-?\d\d)s?\b"
    r"|\b(?:juvenil|youth|academy|reserves?)\b"
    r"|\bB[- ]team\b"
    r"|\s(?:B|C|II|III)$",
    re.IGNORECASE,
)


class NormaliseError(ValueError):
    """A player can't become a record. The message starts with the Q-id."""


@dataclass(frozen=True)
class SizedPhoto:
    """A photo Commons allows, and the WebP file the pipeline wrote for it."""

    decision: Publish
    file: Photo


@dataclass(frozen=True)
class ClubSpell:
    """One senior club spell, keyed by the club's Q-id until the build has a slug."""

    club_qid: str
    club_display_name: str
    start_year: int
    end_year: int | None
    appearances: dict[str, object] | None
    goals: dict[str, object] | None

    def body(self, club_slug: str) -> dict[str, object]:
        """Return the spell as `careerSpells` holds it. Unknown values are absent."""
        body: dict[str, object] = {
            "club": f"clubs/{club_slug}",
            "startYear": self.start_year,
            "endYear": self.end_year,
            "appearanceCount": self.appearances,
            "goalCount": self.goals,
        }
        return {k: v for k, v in body.items() if v is not None}


@dataclass(frozen=True)
class PlayerRecord:
    """A player's `players/{id}.json` body, its list summary and what was dropped."""

    player: dict[str, object]
    summary: dict[str, object]
    club_display_name: str | None
    problems: tuple[str, ...]
    club_qid: str | None = None  # The current club, which the build keys clubs by.
    career: tuple[ClubSpell, ...] = ()  # Oldest first. The build adds the clubs.


def senior_national_teams(facts: PlayerFacts) -> list[Spell]:
    """Return the national team spells that aren't youth or regional.

    A national team with no label counts as youth, as the record does. A team
    with no FIFA code, such as Catalonia, isn't a senior national team.
    """
    return [
        s
        for s in facts.national_teams
        if s.code and not _YOUTH.search(s.team_label or "U21")
    ]


def current_senior_teams(facts: PlayerFacts) -> tuple[list[Spell], list[Spell]]:
    """Split the senior spells into the current team's and the other teams'.

    The current team has a spell with no end date or, if every spell has ended,
    the latest end date.

    Raises:
        NormaliseError: Two teams tie, so the current one can't be told.
    """
    senior = senior_national_teams(facts)
    teams = {s.team for s in senior}
    if len(teams) <= 1:
        return senior, []
    open_teams = {s.team for s in senior if s.end is None}
    if open_teams:
        candidates = open_teams
    else:
        latest = max(s.end or "" for s in senior)
        candidates = {s.team for s in senior if s.end == latest}
    if len(candidates) != 1:
        raise NormaliseError(
            f"{facts.qid}: can't tell the current senior national team"
        )
    current = candidates.pop()
    return (
        [s for s in senior if s.team == current],
        [s for s in senior if s.team != current],
    )


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
    # Youth teams are left out. A national team with no label counts as youth.
    clubs = [s for s in facts.clubs if not _YOUTH.search(s.team_label or "")]
    senior, others = current_senior_teams(facts)
    problems += [
        f"{qid}: dropped senior national team {t}"
        for t in sorted({s.team_label or s.team for s in others})
    ]
    club_counts = _totals(clubs, CLUB_BOUNDS, qid, problems)
    caps, nation_goals = _totals(senior, NATIONAL_BOUNDS, qid, problems)
    position = card_position(facts, entry)
    card_facts = ratings.Facts(
        *club_counts, caps, nation_goals, _day(facts.birth_date), _day(facts.as_of)
    )
    try:
        card = ratings.compute_card(position, entry.grades, card_facts)
    except ratings.RatingInputError as exc:
        raise NormaliseError(f"{qid}: {exc}") from exc
    keeper = position == Position.GOALKEEPER
    current = sorted((s for s in clubs if s.end is None), key=_newest)
    state = _state(facts, clubs, update_time, problems)
    club, club_slug = _club(current, qid, problems)
    player: dict[str, object] = {
        "name": f"players/{slug}",
        "displayName": name,
        "state": state,
        "club": f"clubs/{club_slug}" if club_slug else None,
        "nationalTeamCode": national_team_code,
        "position": position.value,
        # The override is applied after the formula, so ICON needs no tier rule.
        "tier": override.tier if override else card.tier.value,
        "goalkeeperRatings" if keeper else "outfieldRatings": dict(card.ratings),
        "playStats": {k: getattr(card, k) for k in PLAY_STATS},
        "photo": _photo(photo, qid),
        "updateTime": update_time,
        "clubGoalCount": _sourced(facts, clubs, club_counts[1]),
        "nationalTeamGoalCount": _sourced(facts, senior, nation_goals),
    }
    player = {k: v for k, v in player.items() if v is not None}
    summary = {k: v for k, v in player.items() if k not in FULL_ONLY}
    club_qid = current[-1].team if club else None
    career = career_spells(facts, clubs, problems)
    return PlayerRecord(
        player, summary, club or None, tuple(problems), club_qid, career
    )


def career_spells(
    facts: PlayerFacts, clubs: Sequence[Spell], problems: list[str]
) -> tuple[ClubSpell, ...]:
    """Return the senior club spells, oldest first, and report each one dropped.

    `clubs` has the youth and reserve sides already left out. A spell with no
    usable start year, an end before its start or a club with no checked
    English label is dropped. Two spells at one club stay two items.
    """
    found: list[ClubSpell] = []
    for spell in clubs:
        start, end = _year(spell.start), _year(spell.end)
        who = f"{facts.qid} {spell.team}"
        try:
            label = club_name(spell.team, spell.team_label)
        except LabelError as exc:
            problems.append(f"{facts.qid} {exc}: career spell dropped")
            continue
        if start is None:
            problems.append(f"{who}: career spell has no start year, dropped")
        elif spell.end and (end is None or end < start):
            problems.append(f"{who}: career spell ends before it starts, dropped")
        else:
            counts = [
                _spell_count(facts, spell, value, bound)
                for value, bound in zip(
                    (spell.appearances, spell.goals), CLUB_BOUNDS, strict=True
                )
            ]
            found.append(ClubSpell(spell.team, label, start, end, *counts))
    found.sort(key=lambda c: (c.start_year, c.end_year or 9999, c.club_qid))
    return tuple(found)


def _year(day: str | None) -> int | None:
    """Return a date's year when it is in the range the schema allows."""
    year = (day or "")[:4]
    return int(year) if year.isdigit() and 1850 <= int(year) <= 2100 else None


def _spell_count(
    facts: PlayerFacts, spell: Spell, value: int | None, bound: int
) -> dict[str, object] | None:
    """Wrap one spell's count. A count over its bound is absent (`_totals` reports)."""
    return None if value is None or value > bound else _sourced(facts, [spell], value)


def _state(
    facts: PlayerFacts, clubs: Sequence[Spell], update_time: str, problems: list[str]
) -> str:
    """Return ACTIVE or RETIRED, and report what Wikidata leaves unclear.

    Wikidata often leaves a current spell without a start or with a stale end,
    so a missing open spell doesn't mean a player retired. RETIRED needs a
    end of work period (P2032) or a last spell that ended two or more calendar
    years before the run. The run's date is `update_time`'s. Years are
    compared, whatever precision an end date has.
    """
    spells = [*clubs, *senior_national_teams(facts)]
    has_open = any(s.end is None for s in spells)
    if facts.career_end is not None:
        if has_open:
            problems.append(
                f"{facts.qid}: end of work period and an open spell conflict"
            )
        return "RETIRED"
    if has_open:
        return "ACTIVE"
    if not spells:
        problems.append(
            f"{facts.qid}: no spells and no end of work period, kept ACTIVE"
        )
        return "ACTIVE"
    last_year = max(int(s.end[:4]) for s in spells if s.end)
    return "RETIRED" if int(update_time[:4]) - last_year >= 2 else "ACTIVE"


def _require(ok: bool, qid: str, reason: str) -> None:
    if not ok:
        raise NormaliseError(f"{qid}: {reason}")


def card_position(facts: PlayerFacts, entry: GradeEntry) -> Position:
    """Return the card position: the first basic one listed, else the first specific.

    Raises:
        NormaliseError: No listed position fits the grade group.
    """
    keeper = entry.group == "goalkeeper"
    for table in (POSITIONS, SPECIFIC_POSITIONS):
        for item in facts.positions:
            found = table.get(item)
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


def _club(current: Sequence[Spell], qid: str, problems: list[str]) -> tuple[str, str]:
    """Return the current club's checked name and slug, or report why it has none."""
    if not current:
        return "", ""
    team = current[-1].team
    try:
        name = club_name(team, current[-1].team_label)
        return name, assign_slugs({team: name})[team]
    except LabelError as exc:
        problems.append(f"{qid} {exc}")
        return "", ""


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
