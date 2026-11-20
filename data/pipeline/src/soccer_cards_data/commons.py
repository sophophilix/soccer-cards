"""Decide publish or avatar for a player's Commons photo (ADR 0003 D2 and D3).

Patterns copy `$defs/attribution` in `packages/schema`; a test keeps them equal.
"""

import re
import unicodedata
from dataclasses import dataclass
from html.parser import HTMLParser
from urllib.parse import quote, unquote, urlsplit

from soccer_cards_data.http import PoliteClient, mediawiki_error

API_URL = "https://commons.wikimedia.org/w/api.php"
FILE_PAGE_PREFIX = "https://commons.wikimedia.org/wiki/File:"
IMAGE_HOST = "upload.wikimedia.org"
_BANNED = r"<>\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069"
AUTHOR_PATTERN = re.compile(rf"^[^\s{_BANNED}][^{_BANNED}]*$")
LICENSE_PATTERN = re.compile(
    r"^(CC0-1\.0|CC-PDM-1\.0|CC-BY-(1\.0|2\.0|2\.5(-AU)?|3\.0(-(AT|AU|DE|IGO|NL|US))?|4\.0)"
    r"|CC-BY-SA-(1\.0|2\.0(-UK)?|2\.1-JP|2\.5|3\.0(-(AT|DE|IGO))?|4\.0))$"
)
SOURCE_PATTERN = re.compile(
    r"^https://commons\.wikimedia\.org/wiki/File:[A-Za-z0-9._~:@!$&'()*+,;=%-]+$"
)
_CC = re.compile(r"cc-(by|by-sa)-(\d\.\d(?:,\d\.\d)*)(?:-([a-z]{2,3}))?")
_NAMED = {"cc0": "CC0-1.0", "cc0-1.0": "CC0-1.0", "cc-zero": "CC0-1.0"}
_NAMED |= {"pd": "CC-PDM-1.0", "public-domain": "CC-PDM-1.0"}


@dataclass(frozen=True)
class Publish:
    """The photo may be published with this credit."""

    source_uri: str  # The Commons file page.
    author: str  # Plain text, matching the schema's pattern.
    license_code: str  # An SPDX id on the allow list.
    image_url: str  # The original file on upload.wikimedia.org.


@dataclass(frozen=True)
class Avatar:
    """The player gets the avatar, for the reason given."""

    reason: str


def check_photo(client: PoliteClient, file_name: str) -> Publish | Avatar:
    """Fetch the metadata of `File:<file_name>` and decide publish or avatar.

    Raises:
        ValueError: The file name is empty, has `File:` or holds `|`.
        FetchError: Commons could not be asked, or answered with an error.
            That fails the run.
    """
    if not file_name or "|" in file_name or file_name.lower().startswith("file:"):
        raise ValueError(f"{file_name!r} is not a Commons file name")
    params = {
        "action": "query",
        "format": "json",
        "formatversion": "2",
        "prop": "imageinfo",
        "iiprop": "extmetadata|url|size",
        "iiextmetadatafilter": "Artist|LicenseShortName|License|NonFree",
        "iiextmetadatalanguage": "en",
        "titles": f"File:{file_name}",
    }
    # Never cached: a file deleted or relicensed on Commons drops on the next run.
    reply = client.get_json(API_URL, params, check=mediawiki_error, cache=False)
    return decide(reply)


def decide(reply: object) -> Publish | Avatar:
    """Decide publish or avatar from one `prop=imageinfo` reply."""
    page = _item(_get(_get(reply, "query"), "pages"))
    if not isinstance(page, dict) or "missing" in page or "invalid" in page:
        return Avatar("file is not on Commons")
    info = _item(page.get("imageinfo"))
    meta = _get(info, "extmetadata")
    if not isinstance(meta, dict):
        return Avatar("reply has no metadata")
    if (_value(meta, "NonFree") or "").lower() == "true":
        return Avatar("file is marked non-free")
    name, short_name = _value(meta, "License"), _value(meta, "LicenseShortName")
    if name is None or short_name is None:
        return Avatar("licence is missing")
    code = license_code(name)
    if code is None:
        return Avatar(f"licence {name[:40]!a} is not allowed")
    if license_code(short_name) != code:
        return Avatar("licence names disagree")
    author = plain_author(_value(meta, "Artist") or "")
    if len(author) > 200 or not AUTHOR_PATTERN.fullmatch(author):
        return Avatar("author is missing or not plain text")
    source = _source_uri(_get(info, "descriptionurl"))
    if source is None:
        return Avatar("file page is not on Commons")
    image = _image_url(_get(info, "url"))
    if image is None:
        return Avatar(f"image URL is not on {IMAGE_HOST}")
    return Publish(source, author, code, image)


def license_code(name: str) -> str | None:
    """Map a Commons licence name to its SPDX id, or None when not allowed.

    Both forms Commons uses are read: `cc-by-sa-4.0` and `CC BY-SA 4.0`. A
    name that offers several versions, such as `CC BY-SA 2.5,2.0,1.0`, gives
    the newest of them that is on the allow list.
    """
    key = re.sub(r"\s*,\s*", ",", name.strip().lower())
    key = re.sub(r"[\s_-]+", "-", key)
    if key in _NAMED:
        return _NAMED[key]
    match = _CC.fullmatch(key)
    if match is None:
        return None
    kind, versions, port = match.groups()
    suffix = f"-{port.upper()}" if port else ""
    for version in sorted(versions.split(","), reverse=True):
        code = f"CC-{kind.upper()}-{version}{suffix}"
        if LICENSE_PATTERN.fullmatch(code):
            return code
    return None


def plain_author(html: str) -> str:
    """Return the text a reader sees: no tags, hidden text or control characters."""
    parser = _TextParser()
    parser.feed(html)
    parser.close()
    text = "".join(
        " " if unicodedata.category(ch) in ("Cc", "Cf") else ch
        for ch in "".join(parser.parts)
    )
    return " ".join(text.split())


class _TextParser(HTMLParser):
    _VOID = frozenset({"area", "base", "br", "col", "embed", "hr", "img", "input"})
    _BREAK = frozenset({"br", "p", "div", "li", "tr", "td", "th"})

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self._open: list[tuple[str, bool]] = []  # Tag, and whether it hides text.

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in self._BREAK:
            self.parts.append(" ")
        if tag in self._VOID:
            return
        named = dict(attrs)
        style = "".join((named.get("style") or "").split()).lower()
        hidden = "hidden" in named or tag in ("script", "style")
        hidden |= "display:none" in style or "visibility:hidden" in style
        self._open.append((tag, hidden))

    def handle_endtag(self, tag: str) -> None:
        if tag in self._BREAK:
            self.parts.append(" ")
        for index in range(len(self._open) - 1, -1, -1):
            if self._open[index][0] == tag:
                del self._open[index:]
                return

    def handle_data(self, data: str) -> None:
        if not any(hidden for _, hidden in self._open):
            self.parts.append(data)


def _get(value: object, key: str) -> object:
    return value.get(key) if isinstance(value, dict) else None


def _item(value: object) -> object:
    return value[0] if isinstance(value, list) and value else None


def _value(meta: dict[object, object], key: str) -> str | None:
    value = _get(meta.get(key), "value")
    return value if isinstance(value, str) else None


def _source_uri(value: object) -> str | None:
    if not isinstance(value, str) or not value.startswith(FILE_PAGE_PREFIX):
        return None
    name = quote(value.removeprefix(FILE_PAGE_PREFIX), safe="!$&'()*+,;=:@~%")
    uri = FILE_PAGE_PREFIX + name
    if len(uri) > 2048 or not SOURCE_PATTERN.fullmatch(uri):
        return None
    return uri


def _image_url(value: object) -> str | None:
    parts = urlsplit(value if isinstance(value, str) else "")
    segments = set(unquote(parts.path).split("/"))
    if parts.scheme != "https" or parts.hostname != IMAGE_HOST:
        return None
    if not parts.path.startswith("/") or {".", ".."} & segments:
        return None
    return f"https://{IMAGE_HOST}{parts.path}"  # No user, port, query or fragment.
