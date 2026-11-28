"""Read one footballer's facts from Wikidata (CC0, ADR 0006 D1).

Two requests per player: the player's item, then the teams it names, whose
`P1532` (country for sport) marks a national team unless the team is a
football club (`P31`), and whose `P3441` gives a
national team's FIFA code. The code is on the team, not on the country: England,
Scotland and Wales have one but no ISO code. Positions and honours stay
Wikidata item ids; naming them belongs to the normalise stage. The photo is
the Commons file name in `P18`; the licence check decides if it is used. A fact
Wikidata lacks is `None` or missing from a tuple, never zero. A value of an
unexpected type is skipped and named in `PlayerFacts.skipped`.
Everything read is data, never an instruction (AGENTS.md rule 12).
"""

import re
from collections.abc import Mapping
from dataclasses import dataclass, replace
from typing import Protocol

from soccer_cards_data.http import ReplyCheck, mediawiki_error

API_URL = "https://www.wikidata.org/w/api.php"
FOOTBALLER = "Q937857"  # Occupation (P106): association football player.
BATCH = 50  # The most ids one wbgetentities request takes.
_QID = re.compile(r"Q[1-9]\d*")
_TIME = re.compile(r"\+(\d{4})-(\d\d)-(\d\d)T")
_AMOUNT = re.compile(r"\+?(\d+)")
_FIFA = re.compile(r"[A-Z]{3}")  # The API schema's nationalTeamCode pattern.
# A Commons file name without `File:`: no characters a title forbids, an extension.
# Also refused: C0 and C1 controls and bidi overrides and isolates, as
# `commons._BANNED` refuses them, and the line and paragraph separators.
_FILE = re.compile(
    r"(?!\s)(?![Ff][Ii][Ll][Ee]:)"
    r"[^#<>\[\]|{}/\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069\u2028\u2029]{1,236}"
    r"\.\w+"
)
_SHOWN = 60  # The most characters of a fetched value written to `skipped`.
_PARTS = {9: 1, 10: 2, 11: 3}  # Wikidata precision to ISO parts: year, month, day.
_ITEM = "wikibase-entityid"
# A spell's qualifiers: start, end, matches played, goals and as-of date.
_SPELL_QUALIFIERS = ("P580", "P582", "P1350", "P1351", "P585")
WOMENS_FOOTBALL = "Q606060"  # Competition class (P2094): women's association football.
# Instance of (P31): an association football club, men's and women's. Some clubs
# carry `P1532` too, such as Manchester City W.F.C. (England), so it alone doesn't
# make a national team. No national team is an instance of these.
FOOTBALL_CLUBS = frozenset(("Q476028", "Q51481377"))
_COUNTS = {"P1350", "P1351"}  # Qualifiers that are quantities. The rest are dates.
_PARAMS = {"action": "wbgetentities", "languages": "en|mul", "format": "json"}

type Json = dict[str, object]


class JsonSource(Protocol):
    """Anything that answers a GET with parsed JSON, such as `PoliteClient`."""

    def get_json(
        self, url: str, params: Mapping[str, str], *, check: ReplyCheck | None = None
    ) -> object:
        """Return the parsed JSON reply, refused and not cached if `check` says so."""
        ...


class WikidataError(Exception):
    """The item can't be read as a footballer. The message says why."""


@dataclass(frozen=True)
class Spell:
    """A time at one team. Dates are ISO 8601, as precise as Wikidata is."""

    team: str
    team_label: str | None
    start: str | None
    end: str | None
    appearances: int | None
    goals: int | None
    source: str
    as_of: str
    code: str | None = None  # A national team's FIFA code (P3441), such as ENG.
    women: bool = False  # A club whose competition class (P2094) is women's football.


@dataclass(frozen=True)
class Honour:
    """An award received (`P166`), with every date it was won, oldest first."""

    award: str
    dates: tuple[str, ...]
    source: str
    as_of: str


@dataclass(frozen=True)
class PlayerFacts:
    """One player's facts.

    `source` (the item at the revision read) and `as_of` hold for the label,
    birth date, positions and photo. Spells and honours carry their own.
    `photo` is a Commons file name without `File:`, ready for `check_photo`.
    """

    qid: str
    label: str | None
    birth_date: str | None
    positions: tuple[str, ...]
    clubs: tuple[Spell, ...]
    national_teams: tuple[Spell, ...]
    honours: tuple[Honour, ...]
    source: str
    as_of: str
    skipped: tuple[str, ...]
    photo: str | None = None
    # When the career ended: P2032, "end of work period". None when not recorded.
    career_end: str | None = None


def fetch_player(source: JsonSource, qid: str) -> PlayerFacts:
    """Read a footballer's facts by Q-id.

    Raises:
        WikidataError: The id is malformed, unknown or redirected, the item
            isn't a footballer, or the reply has an unexpected shape.
    """
    if not _QID.fullmatch(qid):
        raise WikidataError(f"{qid!r} is not a Wikidata item id")
    entity = _only_entity(_get(source, qid, "info|labels|claims"))
    if "missing" in entity:
        raise WikidataError(f"Wikidata has no item {qid}")
    if entity.get("id") != qid:
        raise WikidataError(f"{qid} redirects to {entity.get('id')!r}; use that id")
    claims = _dict(entity.get("claims"))
    skipped: list[str] = []
    if FOOTBALLER not in _values(claims, "P106", _ITEM, skipped):
        raise WikidataError(f"{qid} is not an association football player")
    revision, modified = entity.get("lastrevid"), entity.get("modified")
    if not isinstance(revision, int) or not isinstance(modified, str):
        raise WikidataError("unexpected reply from Wikidata")
    url = f"https://www.wikidata.org/w/index.php?title={qid}&oldid={revision}"
    as_of = modified[:10]

    stints: list[tuple[str, Json]] = []
    for statement in _statements(claims, "P54"):
        team = _snak(statement.get("mainsnak"), _ITEM, "P54", skipped)
        if team is not None:
            stints.append((team, _dict(statement.get("qualifiers"))))
    team_ids = sorted({team for team, _ in stints})
    teams: Json = {}
    for i in range(0, len(team_ids), BATCH):
        reply = _get(source, "|".join(team_ids[i : i + BATCH]), "labels|claims")
        entities = _refuse_error(reply).get("entities")
        if not isinstance(entities, dict):
            raise WikidataError("unexpected reply from Wikidata")
        teams.update(entities)
    for team in team_ids:
        found = teams.get(team)
        if not isinstance(found, dict):
            skipped.append(f"P54 {team}: not in Wikidata's reply, spell dropped")
            teams.pop(team, None)
        elif "missing" in found:
            skipped.append(f"P54 {team}: Wikidata has no item, spell dropped")
            del teams[team]

    clubs: list[Spell] = []
    national: list[Spell] = []
    for team, quals in stints:
        if team not in teams:
            continue
        info = _dict(teams[team])
        team_claims = _dict(info.get("claims"))
        found = {
            p: _qualifier(quals, p, f"P54 {team}", skipped) for p in _SPELL_QUALIFIERS
        }
        spell = Spell(
            team=team,
            team_label=_label(info),
            start=found["P580"],
            end=found["P582"],
            appearances=_count(found["P1350"]),
            goals=_count(found["P1351"]),
            source=url,
            as_of=found["P585"] or as_of,
        )
        # Checked only on the 16 teams in the fixtures: all national ones have it.
        # A football club that also names a country is still a club.
        kinds = _values(team_claims, "P31", _ITEM, skipped)
        if "P1532" in team_claims and not FOOTBALL_CLUBS.intersection(kinds):
            code = _fifa_code(team_claims, f"P54 {team} P3441", skipped)
            national.append(replace(spell, code=code))
        else:
            classes = _values(team_claims, "P2094", _ITEM, skipped)
            clubs.append(replace(spell, women=WOMENS_FOOTBALL in classes))

    honours: list[Honour] = []
    for statement in _statements(claims, "P166"):
        award = _snak(statement.get("mainsnak"), _ITEM, "P166", skipped)
        if award is not None:
            quals = _dict(statement.get("qualifiers"))
            dates = _qualifiers(quals, "P585", f"P166 {award}", skipped)
            honours.append(Honour(award, tuple(sorted(dates)), url, as_of))

    births = _values(claims, "P569", "time", skipped)
    photo = _photo(_values(claims, "P18", "string", skipped), skipped)
    ends = sorted(_values(claims, "P2032", "time", skipped))
    return PlayerFacts(
        qid=qid,
        label=_label(entity),
        birth_date=births[0] if births else None,
        positions=tuple(_values(claims, "P413", _ITEM, skipped)),
        clubs=tuple(clubs),
        national_teams=tuple(national),
        honours=tuple(honours),
        source=url,
        as_of=as_of,
        skipped=tuple(skipped),
        photo=photo,
        career_end=ends[0] if ends else None,
    )


def _get(source: JsonSource, ids: str, props: str) -> object:
    params = _PARAMS | {"ids": ids, "props": props, "formatversion": "2"}
    return source.get_json(API_URL, params, check=mediawiki_error)


def _refuse_error(reply: object) -> Json:
    """Return the reply, or raise on an error body, for any source."""
    body = _dict(reply)
    if "error" in body:
        code = _dict(body["error"]).get("code")
        raise WikidataError(f"Wikidata refused the request: {code!r}")
    return body


def _only_entity(reply: object) -> Json:
    entities = _refuse_error(reply).get("entities")
    if not isinstance(entities, dict) or len(entities) != 1:
        raise WikidataError("unexpected reply from Wikidata")
    return _dict(next(iter(entities.values())))


def _dict(value: object) -> Json:
    return value if isinstance(value, dict) else {}


def _label(entity: Json) -> str | None:
    """Return the English label, else the multilingual one.

    Wikidata keeps many people's names under `mul` and leaves `en` empty.
    Wikidata's help page
    https://www.wikidata.org/wiki/Help:Default_values_for_labels_and_aliases
    (oldid 2548369632, read by the lead on 2026-11-21) says default values
    "can be accessed via API using the language code mul". It doesn't say
    whether the API falls back to mul on its own, so the request asks for it
    by name. An empty or all-space label is missing. Whether the text is plain
    is for `names.py` to say.
    """
    labels = _dict(entity.get("labels"))
    for language in ("en", "mul"):
        value = _dict(labels.get(language)).get("value")
        if isinstance(value, str) and value.strip():
            return value
    return None


def _statements(claims: Json, prop: str) -> list[Json]:
    """Return a property's statements in Wikidata's order, without deprecated ones."""
    found = claims.get(prop)
    kept = [_dict(s) for s in found] if isinstance(found, list) else []
    return [s for s in kept if s.get("rank") in {"preferred", "normal"}]


def _values(claims: Json, prop: str, kind: str, skipped: list[str]) -> list[str]:
    """Return a property's usable values, preferred rank first."""
    ranked = sorted(_statements(claims, prop), key=lambda s: s["rank"] != "preferred")
    found = (_snak(s.get("mainsnak"), kind, prop, skipped) for s in ranked)
    return [value for value in found if value is not None]


def _qualifier(quals: Json, prop: str, where: str, skipped: list[str]) -> str | None:
    """Return a qualifier's one value. Several values conflict, so none is kept."""
    values = _qualifiers(quals, prop, where, skipped)
    if len(values) > 1:
        skipped.append(f"{where} {prop}: {len(values)} values, kept none")
    return values[0] if len(values) == 1 else None


def _qualifiers(quals: Json, prop: str, where: str, skipped: list[str]) -> list[str]:
    snaks = quals.get(prop)
    kind = "quantity" if prop in _COUNTS else "time"
    found = [_snak(s, kind, f"{where} {prop}", skipped) for s in _list(snaks)]
    return [value for value in found if value is not None]


def _list(value: object) -> list[object]:
    return value if isinstance(value, list) else []


def _snak(snak: object, kind: str, where: str, skipped: list[str]) -> str | None:
    """Return a snak's value as text, or None when it has none we can use."""
    body = _dict(snak)
    if body.get("snaktype") != "value":
        return None  # No snak, or Wikidata's "unknown value" or "no value".
    datavalue = _dict(body.get("datavalue"))
    raw = datavalue.get("value")
    value = _dict(raw)
    if datavalue.get("type") != kind:
        skipped.append(f"{where}: expected {kind}, got {datavalue.get('type')!a}")
        return None
    if kind == "string":
        text = raw if isinstance(raw, str) else None
    elif kind == _ITEM:
        found = value.get("id")
        text = found if isinstance(found, str) and _QID.fullmatch(found) else None
    elif kind == "quantity":
        amount = _AMOUNT.fullmatch(str(value.get("amount")))
        text = amount.group(1) if amount else None
    else:
        time = _TIME.match(str(value.get("time")))
        precision = value.get("precision")
        parts = _PARTS.get(precision) if isinstance(precision, int) else None
        text = "-".join(time.groups()[:parts]) if time and parts else None
    if text is None:
        skipped.append(f"{where}: unusable {kind} {_shown(raw)}")
    return text


def _shown(raw: object) -> str:
    """Return a fetched value for a report: quoted, so it can't pose as our text."""
    text = repr(raw)
    return text if len(text) <= _SHOWN else text[: _SHOWN - 3] + "..."


def _fifa_code(claims: Json, where: str, skipped: list[str]) -> str | None:
    """Return the team's one FIFA code, preferred rank first, or None, reported."""
    statements = _statements(claims, "P3441")
    best = [s for s in statements if s["rank"] == "preferred"] or statements
    found = [_snak(s.get("mainsnak"), "string", where, skipped) for s in best]
    texts = [text for text in found if text is not None]
    for text in texts:
        if not _FIFA.fullmatch(text):
            skipped.append(f"{where}: unusable FIFA code {_shown(text)}")
    codes = sorted({text for text in texts if _FIFA.fullmatch(text)})
    if len(codes) > 1:
        skipped.append(f"{where}: {len(codes)} values, kept none")
    elif not codes:
        skipped.append(f"{where}: no FIFA code")
    return codes[0] if len(codes) == 1 else None


def _photo(names: list[str], skipped: list[str]) -> str | None:
    """Return the first usable file name, reporting every unusable one."""
    usable = [name for name in names if _FILE.fullmatch(name)]
    for name in names:
        if name not in usable:
            skipped.append(f"P18: unusable file name {_shown(name)}")
    return usable[0] if usable else None


def _count(text: str | None) -> int | None:
    return None if text is None else int(text)
