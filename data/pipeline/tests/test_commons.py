import json
from pathlib import Path
from typing import Any

import httpx
import pytest

from soccer_cards_data import commons
from soccer_cards_data.commons import Avatar, Publish, decide
from soccer_cards_data.http import PoliteClient

FIXTURES = Path(__file__).parent / "fixtures" / "commons"
ROOT = Path(__file__).resolve().parents[3]
SCHEMA = ROOT / "packages/schema/schemas/v1/player.schema.json"


def _reply(name: str) -> Any:
    return json.loads((FIXTURES / f"{name}.json").read_text(encoding="utf-8"))


def test_patterns_match_the_schema() -> None:
    attribution = json.loads(SCHEMA.read_text(encoding="utf-8"))["$defs"]["attribution"]
    fields = attribution["properties"]
    assert fields["author"]["pattern"] == commons.AUTHOR_PATTERN.pattern
    assert fields["licenseCode"]["pattern"] == commons.LICENSE_PATTERN.pattern
    assert fields["sourceUri"]["pattern"] == commons.SOURCE_PATTERN.pattern


def test_cc_by_sa_file_publishes_with_its_credit(tmp_path: Path) -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json=_reply("cc-by-sa-3.0"))

    net = httpx.MockTransport(handler)
    with PoliteClient(tmp_path, transport=net, sleep=lambda _: None) as client:
        decision = commons.check_photo(client, "Lionel Messi 20180626.jpg")
    assert decision == Publish(
        source_uri="https://commons.wikimedia.org/wiki/File:Lionel_Messi_20180626.jpg",
        author="Кирилл Венедиктов",
        license_code="CC-BY-SA-3.0",
        image_url="https://upload.wikimedia.org/wikipedia/commons/c/c1/Lionel_Messi_20180626.jpg",
    )
    params = seen[0].url.params
    assert str(seen[0].url).startswith(commons.API_URL)
    assert params["titles"] == "File:Lionel Messi 20180626.jpg"
    assert params["iiprop"] == "extmetadata|url|size"


def test_public_domain_file_publishes_without_its_hidden_text() -> None:
    decision = decide(_reply("public-domain"))
    assert decision == Publish(
        source_uri="https://commons.wikimedia.org/wiki/File:Pele_con_brasil_(cropped).jpg",
        author="Unknown author",
        license_code="CC-PDM-1.0",
        image_url="https://upload.wikimedia.org/wikipedia/commons/5/5e/Pele_con_brasil_%28cropped%29.jpg",
    )


def test_licence_off_the_allow_list_gives_the_avatar() -> None:
    assert decide(_reply("gfdl-edited")) == Avatar("licence 'gfdl' is not allowed")


PAGE = "https://commons.wikimedia.org/wiki/File:"
NO_PAGE = "file page is not on Commons"
NO_IMAGE = "image URL is not on upload.wikimedia.org"
BAD_AUTHOR = "author is missing or not plain text"


@pytest.mark.parametrize(
    ("where", "key", "value", "reason"),
    [
        ("meta", "Artist", None, BAD_AUTHOR),
        ("meta", "Artist", {"value": "<span>  </span>"}, BAD_AUTHOR),
        ("meta", "Artist", {"value": "&lt;b&gt;"}, BAD_AUTHOR),
        ("meta", "Artist", {"value": "A" * 201}, BAD_AUTHOR),
        ("meta", "License", None, "licence is missing"),
        ("meta", "LicenseShortName", None, "licence is missing"),
        ("meta", "LicenseShortName", {"value": "CC BY 3.0"}, "licence names disagree"),
        ("meta", "NonFree", {"value": "true"}, "file is marked non-free"),
        ("info", "extmetadata", None, "reply has no metadata"),
        ("info", "descriptionurl", None, NO_PAGE),
        ("info", "descriptionurl", "https://en.wikipedia.org/wiki/File:A.jpg", NO_PAGE),
        ("info", "descriptionurl", PAGE + "a" * 2048, NO_PAGE),
        ("info", "url", None, NO_IMAGE),
        ("info", "url", "http://upload.wikimedia.org/a.jpg", NO_IMAGE),
        ("info", "url", "https://example.org/a.jpg", NO_IMAGE),
    ],
)
def test_an_incomplete_or_wrong_record_gives_the_avatar(
    where: str, key: str, value: object, reason: str
) -> None:
    reply = _reply("cc-by-sa-3.0")
    info = reply["query"]["pages"][0]["imageinfo"][0]
    target = info["extmetadata"] if where == "meta" else info
    if value is None:
        del target[key]
    else:
        target[key] = value
    assert decide(reply) == Avatar(reason)


@pytest.mark.parametrize(
    "reply",
    [None, [], {"query": {"pages": []}}, {"query": {"pages": [{"missing": True}]}}],
)
def test_unreadable_or_missing_file_gives_the_avatar(reply: object) -> None:
    assert decide(reply) == Avatar("file is not on Commons")


def test_file_page_with_other_letters_is_percent_encoded() -> None:
    reply = _reply("cc-by-sa-3.0")
    info = reply["query"]["pages"][0]["imageinfo"][0]
    info["descriptionurl"] = PAGE + "Ла фа.jpg"
    decision = decide(reply)
    assert isinstance(decision, Publish)
    assert decision.source_uri == PAGE + "%D0%9B%D0%B0%20%D1%84%D0%B0.jpg"


@pytest.mark.parametrize(
    ("license_name", "short_name", "code"),
    [
        ("cc-by-sa-4.0", "CC BY-SA 4.0", "CC-BY-SA-4.0"),
        ("CC_BY_4.0", "cc by 4.0", "CC-BY-4.0"),
        ("cc-by-3.0-us", "CC BY 3.0 us", "CC-BY-3.0-US"),
        ("cc-by-sa-2.1-jp", None, "CC-BY-SA-2.1-JP"),
        ("cc0", "CC0", "CC0-1.0"),
        ("cc-zero", None, "CC0-1.0"),
        ("pd", "Public domain", "CC-PDM-1.0"),
        ("cc-by-sa-3.0-us", None, None),  # Not on the SPDX list.
        ("cc-by-nc-4.0", None, None),
        ("cc-by-sa-5.0", None, None),
        ("gfdl", None, None),
        ("", None, None),
    ],
)
def test_licence_names_map_to_the_right_code_or_none(
    license_name: str, short_name: str | None, code: str | None
) -> None:
    assert commons.license_code(license_name) == code
    if short_name is not None:
        assert commons.license_code(short_name) == code


@pytest.mark.parametrize(
    ("html", "text"),
    [
        ('<a href="//commons.wikimedia.org/wiki/User:A">Ana B</a>', "Ana B"),
        ("<p>SVG: A\n</p>\nTurkish: B", "SVG: A Turkish: B"),
        ("Jo&amp;Co&#32;Photos", "Jo&Co Photos"),
        ("Ana\x00B\u202eC\x85D", "Ana B C D"),
        ('Ana<span style="DISPLAY : none">Ana</span><br>B', "Ana B"),
        ("<script>x()</script>Ana<style>p{}</style>", "Ana"),
        ("Ana<img src=x>B", "AnaB"),
        ("&lt;b&gt;", "<b>"),
        ("Ana</b> B<i>", "Ana B"),
    ],
)
def test_author_markup_and_control_characters_are_removed(html: str, text: str) -> None:
    assert commons.plain_author(html) == text


@pytest.mark.parametrize("name", ["", "A.jpg|B.jpg", "File:A.jpg"])
def test_a_bad_file_name_is_refused(name: str, tmp_path: Path) -> None:
    with PoliteClient(tmp_path) as client, pytest.raises(ValueError, match="file name"):
        commons.check_photo(client, name)
