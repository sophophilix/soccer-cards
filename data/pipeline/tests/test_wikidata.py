import json
from collections.abc import Mapping
from pathlib import Path

import httpx
import pytest

from soccer_cards_data.http import FetchError, PoliteClient, ReplyCheck, mediawiki_error
from soccer_cards_data.wikidata import API_URL, Honour, WikidataError, fetch_player

FIXTURES = Path(__file__).parent / "fixtures" / "wikidata"
MESSI = "https://www.wikidata.org/w/index.php?title=Q615&oldid=2568260945"
type Json = dict[str, object]


class SavedResponses:
    """Serves saved wbgetentities replies by their `ids` parameter."""

    def __init__(self, replies: Mapping[str, object] | None = None) -> None:
        self.replies = dict(replies or {})
        self.requests: list[dict[str, str]] = []
        self.checks: list[ReplyCheck | None] = []

    def get_json(
        self, url: str, params: Mapping[str, str], *, check: ReplyCheck | None = None
    ) -> object:
        assert url == API_URL
        self.checks.append(check)
        self.requests.append(dict(params))
        ids = params["ids"]
        if ids in self.replies:
            return self.replies[ids]
        if "|" in ids and "teams" in self.replies:
            return self.replies["teams"]
        name = ids if "|" not in ids else f"{self.requests[0]['ids']}-teams"
        return json.loads((FIXTURES / f"{name}.json").read_text(encoding="utf-8"))


def test_outfield_player_facts_from_saved_responses() -> None:
    source = SavedResponses()
    facts = fetch_player(source, "Q615")

    assert (facts.label, facts.birth_date) == ("Lionel Messi", "1987-06-24")
    assert (facts.source, facts.as_of) == (MESSI, "2026-11-12")
    assert facts.positions == ("Q280658", "Q193592")
    clubs = " ".join(s.team for s in facts.clubs)
    assert clubs == "Q2346842 Q10467 Q7156 Q483020 Q16844931"
    barca = facts.clubs[2]
    assert barca.team_label == "FC Barcelona"
    assert (barca.start, barca.end) == ("2004", "2021")
    assert (barca.appearances, barca.goals, barca.as_of) == (520, 474, "2026-11-12")
    miami = facts.clubs[4]
    assert (miami.start, miami.end, miami.as_of) == ("2023-07-15", None, "2026-08-30")
    senior = next(s for s in facts.national_teams if s.team == "Q79800")
    assert (senior.appearances, senior.goals, senior.source) == (208, 126, MESSI)
    assert len(facts.national_teams) == 3
    assert len(facts.honours) == 66  # 67 statements, one of them deprecated.
    assert facts.honours[0] == Honour("Q17355204", ("2014-07-13",), MESSI, "2026-11-12")
    ballon_dor = next(h for h in facts.honours if h.award == "Q166177")
    assert ballon_dor.dates == ("2009", "2019", "2021", "2023")
    # Counted in the fixture: 218 P585 values; 6 are decades (precision 8),
    # skipped and reported, and 1 is "no value". 2 statements have no P585.
    assert sum(len(h.dates) for h in facts.honours) == 211
    assert len(facts.skipped) == 6
    assert all("'precision': 8" in reason for reason in facts.skipped)
    assert sum(not h.dates for h in facts.honours) == 9
    assert source.requests[0] == {
        "action": "wbgetentities",
        "ids": "Q615",
        "props": "info|labels|claims",
        "languages": "en",
        "format": "json",
        "formatversion": "2",
    }
    assert source.requests[1]["props"] == "labels|claims"
    assert len(source.requests) == 2
    assert source.checks == [mediawiki_error, mediawiki_error]


def test_goalkeeper_facts_from_saved_responses() -> None:
    facts = fetch_player(SavedResponses(), "Q107365")

    assert (facts.label, facts.positions) == ("Manuel Neuer", ("Q201330",))
    clubs = "|".join(str(s.team_label) for s in facts.clubs)
    assert clubs == "FC Schalke 04 II|Schalke 04|FC Bayern Munich"
    assert facts.clubs[1].goals == 0
    germany = next(s for s in facts.national_teams if s.team == "Q43310")
    assert (germany.appearances, germany.start, germany.end) == (128, "2009", "2026")
    assert len(facts.national_teams) == 5


def _player(
    claims: Json, qid: str = "Q1", modified: object = "2026-01-02T03:04Z"
) -> Json:
    footballer = {"rank": "normal", "mainsnak": _item("Q937857")}
    entity: Json = {"id": qid, "lastrevid": 5, "modified": modified, "labels": {}}
    entity["claims"] = {"P106": [footballer], **claims}
    return {"entities": {"Q1": entity}}


def _year(year: int) -> dict[str, object]:
    value = {"time": f"+{year}-00-00T00:00:00Z", "precision": 9}
    return {"snaktype": "value", "datavalue": {"type": "time", "value": value}}


def _item(qid: str) -> dict[str, object]:
    value = {"type": "wikibase-entityid", "value": {"id": qid}}
    return {"snaktype": "value", "datavalue": value}


@pytest.mark.parametrize(
    ("qid", "reply", "message"),
    [
        ("Q1", {"entities": {"Q1": {"id": "Q1", "missing": True}}}, "no item Q1"),
        ("Q1", {"error": {"code": "no-such-entity"}}, "'no-such-entity'"),
        ("Q1", _player({}, qid="Q2"), "Q1 redirects to 'Q2'"),
        ("Q1", {"entities": {"Q1": {"id": "Q1"}}}, "not an association football"),
        ("Q1", _player({}, modified=3), "unexpected reply"),
        ("Q1", {"entities": []}, "unexpected reply"),
        ("Q1", _player({"P106": []}), "Q1 is not an association football player"),
        ("q1 ", {}, "not a Wikidata item id"),
    ],
)
def test_bad_entities_give_a_clear_error(qid: str, reply: object, message: str) -> None:
    with pytest.raises(WikidataError, match=message):
        fetch_player(SavedResponses({qid: reply}), qid)


def test_a_qualifier_of_an_unexpected_type_is_skipped_and_reported() -> None:
    odd = {"snaktype": "value", "datavalue": {"type": "string", "value": "ten"}}
    some = {"snaktype": "somevalue"}
    quals = {"P580": [_year(2001), _year(2002)], "P1350": [odd], "P1351": [some]}
    spell = {"rank": "normal", "mainsnak": _item("Q9"), "qualifiers": quals}
    old = {"type": "time", "value": {"time": "+1900-00-00T00:00:00Z", "precision": 7}}
    birth = {"rank": "normal", "mainsnak": {"snaktype": "value", "datavalue": old}}
    gone = {"rank": "deprecated", "mainsnak": _item("Q8")}
    team = {"entities": {"Q9": {"id": "Q9", "labels": {}, "claims": {}}}}
    source = SavedResponses({"Q1": _player({"P54": [spell, gone], "P569": [birth]})})
    source.replies["Q9"] = team

    facts = fetch_player(source, "Q1")

    (club,) = facts.clubs
    assert (club.start, club.appearances, club.goals) == (None, None, None)
    assert (club.team_label, facts.birth_date, facts.label) == (None, None, None)
    assert facts.skipped == (
        "P54 Q9 P580: 2 values, kept none",
        "P54 Q9 P1350: expected quantity, got string",
        "P569: unusable time {'time': '+1900-00-00T00:00:00Z', 'precision': 7}",
    )


def test_an_error_body_for_the_team_request_fails_the_player_read() -> None:
    source = SavedResponses({"teams": {"error": {"code": "maxlag"}}})
    with pytest.raises(WikidataError, match="refused the request: 'maxlag'"):
        fetch_player(source, "Q615")


def test_a_team_reply_in_maxlag_is_retried_then_fails_uncached(tmp_path: Path) -> None:
    player = json.loads((FIXTURES / "Q615.json").read_text(encoding="utf-8"))
    lagged = {"error": {"code": "maxlag", "info": "Waiting for a database"}}
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        reply = player if request.url.params["ids"] == "Q615" else lagged
        return httpx.Response(200, json=reply)

    net = httpx.MockTransport(handler)
    with (
        PoliteClient(tmp_path, transport=net, sleep=lambda _: None) as client,
        pytest.raises(FetchError, match="after 4 tries"),
    ):
        fetch_player(client, "Q615")
    assert len(seen) == 5
    assert len(list(tmp_path.iterdir())) == 1  # The player's reply, not the teams'.
