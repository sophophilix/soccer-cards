"""Polite HTTP GET for the pipeline's sources, with an on-disk cache.

Wikimedia asks for an identifying User-Agent, one request at a time, and
back-off when it answers 429 (ADR 0003 D4, ADR 0006 D1). Every reply is JSON
and is cached under `data/pipeline/.cache/`, keyed by the request URL, so a
rerun asks only for what it hasn't seen.
"""

import hashlib
import json
import time
from collections.abc import Callable, Mapping
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

    def get_json(self, url: str, params: Mapping[str, str]) -> object:
        """Return the JSON reply to a GET, from the cache when it has one.

        Raises:
            FetchError: The URL isn't an allowed HTTPS host, the request
                failed for good, or the reply isn't strict JSON.
        """
        request = self._http.build_request("GET", url, params=params)
        if request.url.scheme != "https" or request.url.host not in ALLOWED_HOSTS:
            raise FetchError(f"{request.url} is not an allowed source")
        key = hashlib.sha256(str(request.url).encode()).hexdigest()
        cached = self._cache_dir / f"{key}.json"
        if cached.is_file():
            return _parse(cached.read_bytes())
        body = self._send(request)
        try:
            data = _parse(body)
        except ValueError as exc:
            raise FetchError(f"{request.url} did not return JSON") from exc
        self._cache_dir.mkdir(parents=True, exist_ok=True)
        partial = cached.with_suffix(".part")
        partial.write_bytes(body)
        partial.replace(cached)
        return data

    def _send(self, request: httpx.Request) -> bytes:
        host = request.url.host
        wait = 0.0
        cause: Exception | None = None
        for attempt in range(MAX_TRIES):
            last = self._last_reply.get(host)
            gap = 0.0 if last is None else MIN_GAP_SECONDS - (self._clock() - last)
            self._sleep_at_least(max(wait, gap))
            wait = BACKOFF_SECONDS * 2**attempt
            try:
                response = self._http.send(request)
            except httpx.TransportError as exc:
                cause = exc  # A timeout or a dropped connection: try again.
                continue
            finally:
                self._last_reply[host] = self._clock()
            status = response.status_code
            if status == httpx.codes.OK:
                return response.content
            if status != httpx.codes.TOO_MANY_REQUESTS and status < 500:
                raise FetchError(f"{request.url} answered HTTP {status}")
            cause = FetchError(f"{request.url} answered HTTP {status}")
            wait = max(wait, _retry_after(response))
            if wait > MAX_WAIT_SECONDS:
                raise FetchError(f"{request.url} asked to wait {wait:.0f} seconds")
        raise FetchError(f"gave up on {request.url} after {MAX_TRIES} tries") from cause

    def _sleep_at_least(self, seconds: float) -> None:
        if seconds > 0:
            self._sleep(seconds)


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
