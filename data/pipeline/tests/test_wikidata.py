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
    assert [s.code for s in facts.national_teams] == ["ARG", "ARG", "ARG"]
    assert all(s.code is None for s in facts.clubs)
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
    assert facts.photo == "Leo Messi Argentina v Egypt 7 July 2026-1.jpg"
    assert source.requests[0] == {
        "action": "wbgetentities",
        "ids": "Q615",
        "props": "info|labels|claims",
        "languages": "en|mul",
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
    assert germany.code == "GER"
    assert len(facts.national_teams) == 5
    # The fixture has no FIFA code for the under-18 team: it stays national, codeless.
    under_18 = next(s for s in facts.national_teams if s.team == "Q2016992")
    assert under_18.code is None
    assert facts.skipped == ("P54 Q2016992 P3441: no FIFA code",)
    assert facts.photo == "Manuel Neuer Ecuador v Germany 25 June 2026-148.jpg"


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
        "P54 Q9 P1350: expected quantity, got 'string'",
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


def _spells(*teams: str) -> Json:
    return {"P54": [{"rank": "normal", "mainsnak": _item(team)} for team in teams]}


def test_home_nations_get_their_fifa_codes_without_an_iso_code() -> None:
    saved = (FIXTURES / "home-nations-teams.json").read_text(encoding="utf-8")
    player = _player(_spells("Q47762", "Q34044", "Q180857"))
    source = SavedResponses({"Q1": player, "teams": json.loads(saved)})

    facts = fetch_player(source, "Q1")

    assert [s.code for s in facts.national_teams] == ["ENG", "SCO", "WAL"]
    assert (facts.clubs, facts.skipped) == ((), ())


def _team(qid: str, codes: list[object], preferred: int | None = None) -> Json:
    country = {"rank": "normal", "mainsnak": _item("Q2")}
    found = [
        {"rank": "preferred" if i == preferred else "normal", "mainsnak": _code(code)}
        for i, code in enumerate(codes)
    ]
    claims = {"P1532": [country], "P3441": found}
    return {"id": qid, "labels": {}, "claims": claims}


def _code(value: object) -> Json:
    kind = "string" if isinstance(value, str) else "quantity"
    return {"snaktype": "value", "datavalue": {"type": kind, "value": value}}


@pytest.mark.parametrize(
    ("codes", "reason"),
    [
        ([], "P54 Q9 P3441: no FIFA code"),
        (["Arg"], "P54 Q9 P3441: unusable FIFA code 'Arg'"),
        (["A" * 99], f"P54 Q9 P3441: unusable FIFA code '{'A' * 56}..."),
        ([{"amount": "+32"}], "P54 Q9 P3441: expected string, got 'quantity'"),
        (["ARG", "URU"], "P54 Q9 P3441: 2 values, kept none"),
    ],
)
def test_a_national_team_without_one_usable_code_has_none(
    codes: list[object], reason: str
) -> None:
    teams = {"entities": {"Q9": _team("Q9", codes)}}
    source = SavedResponses({"Q1": _player(_spells("Q9")), "Q9": teams})

    facts = fetch_player(source, "Q1")

    (spell,) = facts.national_teams
    assert spell.code is None
    assert reason in facts.skipped


def test_the_same_code_twice_is_one_code() -> None:
    teams = {"entities": {"Q9": _team("Q9", ["ARG", "ARG"])}}
    source = SavedResponses({"Q1": _player(_spells("Q9")), "Q9": teams})

    (spell,) = fetch_player(source, "Q1").national_teams
    assert spell.code == "ARG"


def test_a_preferred_code_wins_over_a_normal_one() -> None:
    teams = {"entities": {"Q9": _team("Q9", ["ENG", "GBR"], preferred=0)}}
    source = SavedResponses({"Q1": _player(_spells("Q9")), "Q9": teams})

    facts = fetch_player(source, "Q1")

    (spell,) = facts.national_teams
    assert (spell.code, facts.skipped) == ("ENG", ())


@pytest.mark.parametrize("entities", [[], "Q9", None])
def test_a_team_reply_without_an_entities_dict_fails_the_read(
    entities: object,
) -> None:
    reply = {"entities": entities}
    source = SavedResponses({"Q1": _player(_spells("Q9")), "Q9": reply})
    with pytest.raises(WikidataError, match="unexpected reply"):
        fetch_player(source, "Q1")


def test_a_team_missing_from_the_reply_is_reported_not_filed_as_a_club() -> None:
    gone = {"id": "Q8", "missing": ""}
    teams = {"entities": {"Q8": gone, "Q9": _team("Q9", ["ARG"])}}
    player = _player(_spells("Q7", "Q8", "Q9"))
    source = SavedResponses({"Q1": player, "teams": teams})

    facts = fetch_player(source, "Q1")

    assert facts.clubs == ()
    assert [s.team for s in facts.national_teams] == ["Q9"]
    assert facts.skipped == (
        "P54 Q7: not in Wikidata's reply, spell dropped",
        "P54 Q8: Wikidata has no item, spell dropped",
    )


def _photo(value: object, rank: str = "normal") -> Json:
    return {"rank": rank, "mainsnak": _code(value)}


@pytest.mark.parametrize(
    ("photos", "expected"),
    [
        ([], None),
        ([_photo("A.jpg"), _photo("B.jpg")], "A.jpg"),
        ([_photo("A.jpg"), _photo("B.jpg", "preferred")], "B.jpg"),
        ([_photo("A.jpg", "deprecated"), _photo("B.jpg")], "B.jpg"),
        ([_photo("A.jpg", "deprecated")], None),
        ([{"rank": "normal", "mainsnak": {"snaktype": "novalue"}}], None),
    ],
)
def test_the_photo_is_the_first_p18_file_preferred_rank_first(
    photos: list[Json], expected: str | None
) -> None:
    claims: Json = {"P18": photos} if photos else {}
    facts = fetch_player(SavedResponses({"Q1": _player(claims)}), "Q1")

    assert (facts.photo, facts.skipped) == (expected, ())


@pytest.mark.parametrize(
    ("value", "reason"),
    [
        ({"amount": "+1"}, "P18: expected string, got 'quantity'"),
        ("", "P18: unusable file name ''"),
        ("File:A.jpg", "P18: unusable file name 'File:A.jpg'"),
        ("A|B.jpg", "P18: unusable file name 'A|B.jpg'"),
        ("A\nB.jpg", "P18: unusable file name 'A\\nB.jpg'"),
        (" A.jpg", "P18: unusable file name ' A.jpg'"),
        ("no-extension", "P18: unusable file name 'no-extension'"),
        ("A" * 300 + ".jpg", f"P18: unusable file name '{'A' * 56}..."),
    ],
)
def test_a_malformed_photo_is_skipped_and_reported(value: object, reason: str) -> None:
    claims: Json = {"P18": [_photo(value, "preferred"), _photo("Good.jpg")]}
    facts = fetch_player(SavedResponses({"Q1": _player(claims)}), "Q1")

    assert (facts.photo, facts.skipped) == ("Good.jpg", (reason,))


# C1 control, bidi override, bidi isolate, line and paragraph separators.
@pytest.mark.parametrize("code", [0x85, 0x9F, 0x202E, 0x2066, 0x2028, 0x2029])
def test_a_photo_name_with_a_hidden_character_is_skipped(code: int) -> None:
    name = f"A{chr(code)}B.jpg"
    claims: Json = {"P18": [_photo(name, "preferred"), _photo("Good.jpg")]}
    facts = fetch_player(SavedResponses({"Q1": _player(claims)}), "Q1")

    assert facts.photo == "Good.jpg"
    assert facts.skipped == (f"P18: unusable file name {name!r}",)


def test_a_bad_photo_after_the_chosen_one_is_still_reported() -> None:
    claims: Json = {"P18": [_photo("Good.jpg"), _photo("File:Bad.jpg")]}
    facts = fetch_player(SavedResponses({"Q1": _player(claims)}), "Q1")

    assert facts.photo == "Good.jpg"
    assert facts.skipped == ("P18: unusable file name 'File:Bad.jpg'",)


def test_a_datavalue_type_is_escaped_in_the_report() -> None:
    odd = {"snaktype": "value", "datavalue": {"type": "x\u202ey", "value": "A.jpg"}}
    claims: Json = {"P18": [{"rank": "normal", "mainsnak": odd}]}

    facts = fetch_player(SavedResponses({"Q1": _player(claims)}), "Q1")

    assert facts.skipped == ("P18: expected string, got 'x\\u202ey'",)


def _labels(**by_language: str) -> Json:
    return {
        code: {"language": code, "value": value} for code, value in by_language.items()
    }


@pytest.mark.parametrize(
    ("labels", "expected"),
    [
        (_labels(en="Sergio Ramos"), "Sergio Ramos"),
        (_labels(mul="Sergio Ramos"), "Sergio Ramos"),
        (_labels(en="Ramos", mul="Sergio Ramos"), "Ramos"),
        (_labels(mul="\u30e9\u30e2\u30b9"), "\u30e9\u30e2\u30b9"),
        (_labels(en="", mul="Sergio Ramos"), "Sergio Ramos"),
        (_labels(en="  ", mul="Sergio Ramos"), "Sergio Ramos"),
        ({}, None),
        (_labels(de="Sergio Ramos"), None),
    ],
)
def test_the_label_is_english_else_multilingual_for_player_and_team(
    labels: Json, expected: str | None
) -> None:
    spell = {"rank": "normal", "mainsnak": _item("Q9")}
    reply = _player({"P54": [spell]})
    reply["entities"]["Q1"]["labels"] = labels  # type: ignore[index]
    team = {"entities": {"Q9": {"id": "Q9", "labels": labels, "claims": {}}}}
    source = SavedResponses({"Q1": reply, "Q9": team})

    facts = fetch_player(source, "Q1")

    assert facts.label == expected
    assert facts.clubs[0].team_label == expected


def _with_career_end(statements: list[Json]) -> Json:
    reply = json.loads((FIXTURES / "Q615.json").read_text(encoding="utf-8"))
    (entity,) = reply["entities"].values()
    entity["claims"]["P2032"] = statements
    return reply  # type: ignore[no-any-return]


def _time(value: str, precision: int = 11, rank: str = "normal") -> Json:
    snak = {
        "snaktype": "value",
        "property": "P2032",
        "datavalue": {
            "type": "time",
            "value": {"time": value, "precision": precision},
        },
    }
    return {"mainsnak": snak, "rank": rank, "type": "statement"}


def test_career_end_is_read_from_p2032() -> None:
    reply = _with_career_end([_time("+2024-05-18T00:00:00Z")])
    facts = fetch_player(SavedResponses({"Q615": reply}), "Q615")
    assert facts.career_end == "2024-05-18"


def test_career_end_keeps_the_year_when_only_the_year_is_known() -> None:
    reply = _with_career_end([_time("+2019-00-00T00:00:00Z", precision=9)])
    facts = fetch_player(SavedResponses({"Q615": reply}), "Q615")
    assert facts.career_end == "2019"


def test_career_end_ignores_a_deprecated_statement() -> None:
    reply = _with_career_end([_time("+2019-01-01T00:00:00Z", rank="deprecated")])
    facts = fetch_player(SavedResponses({"Q615": reply}), "Q615")
    assert facts.career_end is None


def test_career_end_is_absent_when_wikidata_has_none() -> None:
    assert fetch_player(SavedResponses(), "Q615").career_end is None


def _womens_team(qid: str, classes: list[str]) -> Json:
    found = [{"rank": "normal", "mainsnak": _item(item)} for item in classes]
    return {"id": qid, "labels": {}, "claims": {"P2094": found}}


@pytest.mark.parametrize(
    ("classes", "women"),
    [
        (["Q606060"], True),
        (["Q15991290", "Q606060"], True),
        (["Q15991290"], False),
        ([], False),
    ],
)
def test_a_club_whose_competition_class_is_womens_football_is_a_womens_side(
    classes: list[str], women: bool
) -> None:
    teams = {"entities": {"Q9": _womens_team("Q9", classes)}}
    source = SavedResponses({"Q1": _player(_spells("Q9")), "Q9": teams})

    (spell,) = fetch_player(source, "Q1").clubs

    assert spell.women is women


def test_a_saved_mens_club_is_not_a_womens_side() -> None:
    assert not any(s.women for s in fetch_player(SavedResponses(), "Q615").clubs)


def test_a_womens_club_with_a_country_for_sport_is_a_club_not_a_national_team() -> None:
    # Saved from Wikidata: Manchester City W.F.C. (Q3844288) has P1532 (England)
    # but is a women's association football club (Q51481377), and has no P3441.
    saved = (FIXTURES / "womens-club-teams.json").read_text(encoding="utf-8")
    player = _player(_spells("Q3844288", "Q204204"))
    source = SavedResponses({"Q1": player, "teams": json.loads(saved)})

    facts = fetch_player(source, "Q1")

    (club,) = facts.clubs
    assert (club.team, club.team_label, club.women) == (
        "Q3844288",
        "Manchester City W.F.C.",
        True,
    )
    (national,) = facts.national_teams
    assert (national.team, national.code) == ("Q204204", "ENG")
    assert facts.skipped == ()


def test_a_team_with_a_country_for_sport_and_no_club_class_stays_national() -> None:
    teams = {"entities": {"Q9": _team("Q9", ["ARG"])}}
    source = SavedResponses({"Q1": _player(_spells("Q9")), "Q9": teams})

    facts = fetch_player(source, "Q1")

    assert (facts.clubs, [s.team for s in facts.national_teams]) == ((), ["Q9"])
