"""Polite HTTP GET for the pipeline's sources, with an on-disk cache.

Wikimedia asks for an identifying User-Agent, one request at a time, and
back-off when it answers 429 (ADR 0003 D4, ADR 0006 D1). A JSON reply is
cached under `data/pipeline/.cache/`, keyed by the request URL, so a rerun
asks only for what it hasn't seen. A caller's check can refuse a reply, such
as a MediaWiki error sent with HTTP 200, before it is cached. Downloaded bytes,
such as photos, are never cached.
"""

import hashlib
import json
import time
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from importlib.metadata import version
from pathlib import Path
from typing import Self

import httpx

USER_AGENT = (
    f"SoccerCardsDataPipeline/{version('soccer-cards-data')} "
    "(https://github.com/sophophilix/soccer-cards)"
)
TIMEOUT_SECONDS = 30.0  # For each connect, read and write.
MIN_GAP_SECONDS = 1.0  # Between one reply from a host and the next request to it.
MAX_TRIES = 4  # Then the fetch fails.
BACKOFF_SECONDS = 2.0  # The first back-off. Each later one doubles.
MAX_WAIT_SECONDS = 120.0  # A longer Retry-After is a failure, not a wait.
DEFAULT_CACHE_DIR = Path(__file__).resolve().parents[2] / ".cache"
# The only hosts the pipeline may ask, all over HTTPS (ADR 0006 D1).
_WIKIDATA = ("www.wikidata.org", "query.wikidata.org")
ALLOWED_HOSTS = frozenset((*_WIKIDATA, "commons.wikimedia.org", "upload.wikimedia.org"))


class FetchError(Exception):
    """A request failed for good. The message names the URL."""


@dataclass(frozen=True)
class Refusal:
    """Why a check refused a reply, and whether asking again may help."""

    reason: str
    retry: bool = False


type ReplyCheck = Callable[[object], Refusal | None]


def mediawiki_error(reply: object) -> Refusal | None:
    """Refuse a MediaWiki API error body. A `maxlag` error is worth retrying."""
    if not isinstance(reply, dict) or "error" not in reply:
        return None
    error = reply["error"]
    code = error.get("code") if isinstance(error, dict) else None
    return Refusal(f"Wikimedia refused: {code!r}", retry=code == "maxlag")


class PoliteClient:
    """Send GET requests one at a time, and remember every JSON reply."""

    def __init__(
        self,
        cache_dir: Path = DEFAULT_CACHE_DIR,
        *,
        transport: httpx.BaseTransport | None = None,
        clock: Callable[[], float] = time.monotonic,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        """Create a client.

        Args:
            cache_dir: Where replies are cached. Created when first needed.
            transport: Replaces the network, for tests.
            clock: Monotonic seconds, for the gap between requests.
            sleep: Waits the given seconds.
        """
        self._cache_dir = cache_dir
        self._clock = clock
        self._sleep = sleep
        self._last_reply: dict[str, float] = {}
        self._http = httpx.Client(
            headers={"User-Agent": USER_AGENT},
            timeout=TIMEOUT_SECONDS,
            transport=transport,
        )

    def __enter__(self) -> Self:
        """Return the client."""
        return self

    def __exit__(self, *_: object) -> None:
        """Close the connection pool."""
        self._http.close()

    def get_json(
        self,
        url: str,
        params: Mapping[str, str],
        *,
        check: ReplyCheck | None = None,
        cache: bool = True,
    ) -> object:
        """Return the JSON reply to a GET, from the cache when it has one.

        `check` refuses a reply before it is cached; a refusal marked `retry`
        is retried with back-off, like HTTP 503. `cache=False` neither reads
        nor writes the cache, for a fact read fresh on every run.

        Raises:
            FetchError: The URL isn't an allowed HTTPS host, the request
                failed for good, the reply isn't strict JSON, or the check
                refused it.
        """
        request = self._request(url, params)
        key = hashlib.sha256(str(request.url).encode()).hexdigest()
        cached = self._cache_dir / f"{key}.json"
        if cache and cached.is_file():
            return _parse(cached.read_bytes())

        def refuse(body: bytes) -> Refusal | None:
            try:
                data = _parse(body)
            except ValueError as exc:
                raise FetchError(f"{request.url} did not return JSON") from exc
            return check(data) if check else None

        body = self._send(request, refuse)
        if cache:
            self._cache_dir.mkdir(parents=True, exist_ok=True)
            partial = cached.with_suffix(".part")
            partial.write_bytes(body)
            partial.replace(cached)
        return _parse(body)

    def get_bytes(self, url: str, *, max_bytes: int) -> bytes:
        """Download a file, such as a photo, without caching it.

        Raises:
            FetchError: The URL isn't an allowed HTTPS host, the request
                failed for good, or the file is larger than `max_bytes`.
        """
        return self._send(self._request(url, {}), max_bytes=max_bytes)

    def _request(self, url: str, params: Mapping[str, str]) -> httpx.Request:
        request = self._http.build_request("GET", url, params=params)
        if request.url.scheme != "https" or request.url.host not in ALLOWED_HOSTS:
            raise FetchError(f"{request.url} is not an allowed source")
        return request

    def _send(
        self,
        request: httpx.Request,
        refuse: Callable[[bytes], Refusal | None] = lambda _: None,
        max_bytes: int | None = None,
    ) -> bytes:
        host = request.url.host
        wait = 0.0
        cause: Exception | None = None
        for attempt in range(MAX_TRIES):
            last = self._last_reply.get(host)
            gap = 0.0 if last is None else MIN_GAP_SECONDS - (self._clock() - last)
            self._sleep_at_least(max(wait, gap))
            wait = BACKOFF_SECONDS * 2**attempt
            try:
                response = self._http.send(request, stream=True)
                try:
                    body = _read(response, max_bytes)
                finally:
                    response.close()
            except httpx.TransportError as exc:
                cause = exc  # A timeout or a dropped connection: try again.
                continue
            finally:
                self._last_reply[host] = self._clock()
            status = response.status_code
            if status == httpx.codes.OK:
                refusal = refuse(body)
                if refusal is None:
                    return body
                cause = FetchError(f"{request.url} {refusal.reason}")
                if not refusal.retry:
                    raise cause
            elif status != httpx.codes.TOO_MANY_REQUESTS and status < 500:
                raise FetchError(f"{request.url} answered HTTP {status}")
            else:
                cause = FetchError(f"{request.url} answered HTTP {status}")
            wait = max(wait, _retry_after(response))
            if wait > MAX_WAIT_SECONDS:
                raise FetchError(f"{request.url} asked to wait {wait:.0f} seconds")
        raise FetchError(f"gave up on {request.url} after {MAX_TRIES} tries") from cause

    def _sleep_at_least(self, seconds: float) -> None:
        if seconds > 0:
            self._sleep(seconds)


def _read(response: httpx.Response, max_bytes: int | None) -> bytes:
    """Read a streamed body, stopping once it is larger than `max_bytes`."""
    body = bytearray()
    for chunk in response.iter_bytes():
        body += chunk
        if max_bytes is not None and len(body) > max_bytes:
            url = response.request.url
            raise FetchError(f"{url} is larger than {max_bytes} bytes")
    return bytes(body)


def _retry_after(response: httpx.Response) -> float:
    """Read Retry-After as seconds or an HTTP date. Unreadable means zero."""
    value = response.headers.get("Retry-After", "").strip()
    if value.isascii() and value.isdigit():  # Not "²", which int() refuses.
        return float(value)
    try:
        when = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        return 0.0
    return (when.replace(tzinfo=when.tzinfo or UTC) - datetime.now(UTC)).total_seconds()


def _refuse_constant(name: str) -> object:
    raise ValueError(f"{name} is not JSON")


def _parse(body: bytes) -> object:
    """Parse strict JSON: NaN and Infinity are refused, not read as floats."""
    return json.loads(body, parse_constant=_refuse_constant)
