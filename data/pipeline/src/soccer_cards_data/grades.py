"""Load and check the hand-set skill grades and tier overrides (ADR 0006 D2, D4)."""

import re
import tomllib
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from soccer_cards_data import ratings

GRADES_DIR = Path(__file__).resolve().parents[2] / "grades"
PLAYERS_FILE = GRADES_DIR / "players.toml"
OVERRIDES_FILE = GRADES_DIR / "overrides.toml"
PHOTOS_FILE = GRADES_DIR / "photos.toml"
AVATAR = "avatar"

GROUPS = {
    "outfield": ratings.OUTFIELD_RATINGS,
    "goalkeeper": ratings.GOALKEEPER_RATINGS,
}
OVERRIDE_TIERS = ("BASE", "RARE", "LEGEND", "ICON")
GRADE_RANGE = range(ratings.MIN_GRADE, ratings.MAX_GRADE + 1)
MAX_REASON_LENGTH = 160

_QID = re.compile(r"Q[1-9][0-9]*")
# Letters, digits, spaces and plain punctuation: no markup, links or new lines.
_PLAIN = re.compile(r"[\w ,.;:'()&/-]+")
# A number of one or two digits could be read as a rating on the 1 to 99 scale.
_SHORT_NUMBER = re.compile(r"(?<!\d)\d{1,2}(?!\d)")
# Games, card makers and rating sites that must never be cited (ADR 0003 D1).
# FIFA passes only as the governing body, before an award or competition name.
_THIRD_PARTY = re.compile(
    r"\b(fifa(?! (world cup|club world cup|men's|women's|puskas|ballon))|ea ?sports"
    r"|ea fc|ultimate team|fut|efootball|pes|pro evolution|football manager|konami"
    r"|panini|topps|upper deck|match attax|sofifa|futbin|whoscored|sofascore)\b",
    re.IGNORECASE,
)


class GradeFileError(ValueError):
    """A grade or override file is refused. The message names the entry."""


@dataclass(frozen=True)
class GradeEntry:
    """One player's six grades from 1 to 5 and the reason for each."""

    qid: str
    group: str
    grades: dict[str, int]
    reasons: dict[str, str]


@dataclass(frozen=True)
class Override:
    """A tier the lead sets for one player, with the reason."""

    qid: str
    tier: str
    reason: str


@dataclass(frozen=True)
class PhotoChoice:
    """A photo the lead sets for one player: a Commons file, or None for none."""

    qid: str
    file: str | None
    reason: str


def load_grades(path: Path = PLAYERS_FILE) -> dict[str, GradeEntry]:
    """Return each player's grades by Q-id. Any broken rule raises GradeFileError."""
    players: dict[str, GradeEntry] = {}
    for group, table in _read(path).items():
        names = GROUPS.get(group)
        if names is None or not isinstance(table, dict):
            raise GradeFileError(f"{group}: must be one of {', '.join(GROUPS)}")
        for qid, entry in table.items():
            if _check_qid(qid) in players:
                raise GradeFileError(f"{qid}: is listed twice")
            players[qid] = _entry(qid, group, names, entry)
    return players


def load_overrides(
    players: Mapping[str, GradeEntry], path: Path = OVERRIDES_FILE
) -> dict[str, Override]:
    """Return each override by Q-id. Any broken rule raises GradeFileError."""
    overrides: dict[str, Override] = {}
    for qid, line in _read(path).items():
        if _check_qid(qid) not in players:
            raise GradeFileError(f"{qid}: is not in the grade file")
        match line:
            case {"tier": str() as tier, "reason": str() as reason} if len(line) == 2:
                pass
            case _:
                raise GradeFileError(f"{qid}: must be {{ tier = ..., reason = ... }}")
        if tier not in OVERRIDE_TIERS:
            raise GradeFileError(f"{qid}: must be one of {', '.join(OVERRIDE_TIERS)}")
        overrides[qid] = Override(qid, tier, _check_reason(qid, reason))
    return overrides


def load_photo_choices(
    players: Mapping[str, GradeEntry], path: Path = PHOTOS_FILE
) -> dict[str, PhotoChoice]:
    """Return each hand-chosen photo by Q-id. Any broken rule raises GradeFileError."""
    choices: dict[str, PhotoChoice] = {}
    for qid, line in _read(path).items():
        if _check_qid(qid) not in players:
            raise GradeFileError(f"{qid}: is not in the grade file")
        match line:
            case {"photo": str() as photo, "reason": str() as reason} if len(line) == 2:
                pass
            case _:
                raise GradeFileError(f"{qid}: must be {{ photo = ..., reason = ... }}")
        reason = _check_reason(qid, reason)
        if photo == AVATAR:
            choices[qid] = PhotoChoice(qid, None, reason)
        elif _file_name(photo):
            choices[qid] = PhotoChoice(qid, photo, reason)
        else:
            raise GradeFileError(f"{qid}: must be avatar or a Commons file name")
    return choices


def _file_name(name: str) -> bool:
    """Say whether `name` is a bare Commons file name on one line."""
    return (
        bool(name.strip())
        and "|" not in name
        and "\n" not in name
        and not name.lower().startswith("file:")
    )


def _read(path: Path) -> dict[str, Any]:
    try:
        with path.open("rb") as file:
            return tomllib.load(file)
    except tomllib.TOMLDecodeError as exc:
        raise GradeFileError(f"{path.name}: is not valid TOML: {exc}") from exc


def _check_qid(qid: str) -> str:
    if not _QID.fullmatch(qid):
        raise GradeFileError(f"{qid}: must be a Wikidata Q-id such as Q615")
    return qid


def _entry(qid: str, group: str, names: tuple[str, ...], entry: object) -> GradeEntry:
    if not isinstance(entry, dict) or set(entry) != set(names):
        raise GradeFileError(f"{qid}: needs exactly the {group} grades: {names}")
    grades: dict[str, int] = {}
    reasons: dict[str, str] = {}
    for name in names:
        where = f"{qid}.{name}"
        match entry[name]:
            case [int() as grade, str() as reason] if type(grade) is int:
                pass
            case _:
                raise GradeFileError(f"{where}: must be [grade, reason]")
        if grade not in GRADE_RANGE:
            raise GradeFileError(f"{where}: must be a grade from 1 to 5")
        grades[name] = grade
        reasons[name] = _check_reason(where, reason)
    return GradeEntry(qid, group, grades, reasons)


def _check_reason(where: str, reason: str) -> str:
    if not reason.strip():
        raise GradeFileError(f"{where}: needs a reason")
    if len(reason) > MAX_REASON_LENGTH:
        raise GradeFileError(f"{where}: is longer than {MAX_REASON_LENGTH} characters")
    if not _PLAIN.fullmatch(reason):
        raise GradeFileError(f"{where}: must be plain text on one line")
    if _SHORT_NUMBER.search(reason):
        raise GradeFileError(f"{where}: has a number under 100; write it in words")
    if _THIRD_PARTY.search(reason):
        raise GradeFileError(f"{where}: names a video game or card maker")
    return reason
