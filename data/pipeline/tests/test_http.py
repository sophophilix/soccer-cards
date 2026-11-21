from collections.abc import Callable
from pathlib import Path

import httpx
import pytest

from soccer_cards_data.http import (
    MAX_TRIES,
    MIN_GAP_SECONDS,
    TIMEOUT_SECONDS,
    USER_AGENT,
    FetchError,
    PoliteClient,
    Refusal,
    mediawiki_error,
)

URL = "https://www.wikidata.org/w/api.php"


class FakeTime:
    """A clock that moves only when the client sleeps or a response arrives."""

    def __init__(self) -> None:
        self.now = 100.0
        self.sleeps: list[float] = []

    def clock(self) -> float:
        return self.now

    def sleep(self, seconds: float) -> None:
        self.sleeps.append(seconds)
        self.now += seconds


Handler = Callable[[httpx.Request], httpx.Response]


def _client(tmp_path: Path, handler: Handler, fake: FakeTime) -> PoliteClient:
    net = httpx.MockTransport(handler)
    return PoliteClient(tmp_path, transport=net, clock=fake.clock, sleep=fake.sleep)


def _replies(*responses: httpx.Response) -> tuple[Handler, list[httpx.Request]]:
    seen: list[httpx.Request] = []
    queue = list(responses)

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return queue.pop(0)

    return handler, seen


def test_sends_the_project_user_agent(tmp_path: Path) -> None:
    handler, seen = _replies(httpx.Response(200, json={"ok": 1}))
    with _client(tmp_path, handler, FakeTime()) as client:
        assert client.get_json(URL, {"ids": "Q1"}) == {"ok": 1}
    assert seen[0].headers["User-Agent"] == USER_AGENT
    assert USER_AGENT.startswith("SoccerCardsDataPipeline/0.1.0 (https://github.com/")
    assert seen[0].url.params["ids"] == "Q1"
    assert set(seen[0].extensions["timeout"].values()) == {TIMEOUT_SECONDS}


def test_waits_the_minimum_gap_between_requests_to_a_host(tmp_path: Path) -> None:
    ok = httpx.Response(200, json={})
    handler, seen = _replies(ok, ok)
    fake = FakeTime()
    with _client(tmp_path, handler, fake) as client:
        client.get_json(URL, {"ids": "Q1"})
        client.get_json(URL, {"ids": "Q2"})
    assert len(seen) == 2
    assert fake.sleeps == [MIN_GAP_SECONDS]


def test_a_cached_response_is_reused_without_a_request(tmp_path: Path) -> None:
    handler, seen = _replies(httpx.Response(200, json={"n": 1}))
    with _client(tmp_path, handler, FakeTime()) as client:
        first = client.get_json(URL, {"ids": "Q1"})
    with _client(tmp_path, handler, FakeTime()) as client:
        second = client.get_json(URL, {"ids": "Q1"})
    assert first == second == {"n": 1}
    assert len(seen) == 1


@pytest.mark.parametrize(("header", "slept"), [(b"7", 7.0), ("²".encode(), 2.0)])
def test_retry_after_on_429(tmp_path: Path, header: bytes, slept: float) -> None:
    handler, seen = _replies(
        httpx.Response(429, headers={b"Retry-After": header}),
        httpx.Response(200, json={}),
    )
    fake = FakeTime()
    with _client(tmp_path, handler, fake) as client:
        client.get_json(URL, {})
    assert len(seen) == 2
    assert fake.sleeps[0] == slept  # An unreadable header falls back to back-off.


def test_backs_off_on_5xx_and_errors_then_succeeds(tmp_path: Path) -> None:
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        if calls == 1:
            raise httpx.ReadTimeout("slow", request=request)
        return httpx.Response(503 if calls == 2 else 200, json={})

    fake = FakeTime()
    with _client(tmp_path, handler, fake) as client:
        client.get_json(URL, {})
    assert calls == 3
    assert fake.sleeps[1] > fake.sleeps[0] >= MIN_GAP_SECONDS


def test_gives_up_after_max_tries_naming_the_url(tmp_path: Path) -> None:
    handler, seen = _replies(*[httpx.Response(500) for _ in range(MAX_TRIES)])
    with (
        _client(tmp_path, handler, FakeTime()) as client,
        pytest.raises(FetchError, match=r"w/api\.php\?ids=Q9 after 4 tries") as caught,
    ):
        client.get_json(URL, {"ids": "Q9"})
    assert len(seen) == MAX_TRIES
    assert "answered HTTP 500" in str(caught.value.__cause__)


@pytest.mark.parametrize(
    "response",
    [
        httpx.Response(404),
        httpx.Response(429, headers={"Retry-After": "Fri, 01 Jan 2100 00:00:00 GMT"}),
        httpx.Response(200, text="<html>not json</html>"),
        httpx.Response(200, text='{"goals": NaN, "caps": Infinity}'),
    ],
)
def test_a_permanent_failure_stops_at_once_and_caches_nothing(
    tmp_path: Path, response: httpx.Response
) -> None:
    handler, seen = _replies(response)
    with (
        _client(tmp_path, handler, FakeTime()) as client,
        pytest.raises(FetchError, match=r"https://www\.wikidata\.org/"),
    ):
        client.get_json(URL, {})
    assert len(seen) == 1
    assert list(tmp_path.iterdir()) == []


@pytest.mark.parametrize(
    "url", ["http://www.wikidata.org/w/api.php", "https://example.org/w/api.php"]
)
def test_a_url_off_the_allow_list_fails_unsent(tmp_path: Path, url: str) -> None:
    handler, seen = _replies(httpx.Response(200, json={}))
    with (
        _client(tmp_path, handler, FakeTime()) as client,
        pytest.raises(FetchError, match="is not an allowed source"),
    ):
        client.get_json(url, {})
    assert seen == []


MAXLAG = {"error": {"code": "maxlag", "info": "Waiting for a database server"}}
IMAGE = "https://upload.wikimedia.org/wikipedia/commons/c/c1/Photo.jpg"


def test_a_maxlag_body_is_retried_then_refused_and_not_cached(tmp_path: Path) -> None:
    lagged = httpx.Response(200, json=MAXLAG, headers={"Retry-After": "5"})
    handler, seen = _replies(*[lagged] * MAX_TRIES)
    fake = FakeTime()
    with (
        _client(tmp_path, handler, fake) as client,
        pytest.raises(FetchError, match=r"after 4 tries") as caught,
    ):
        client.get_json(URL, {"ids": "Q1"}, check=mediawiki_error)
    assert len(seen) == MAX_TRIES
    assert "'maxlag'" in str(caught.value.__cause__)
    assert fake.sleeps[0] == 5.0
    assert list(tmp_path.iterdir()) == []


def test_a_refused_reply_fails_at_once_and_writes_nothing(tmp_path: Path) -> None:
    handler, seen = _replies(httpx.Response(200, json={"error": {"code": "bad"}}))
    with (
        _client(tmp_path, handler, FakeTime()) as client,
        pytest.raises(FetchError, match=r"wikidata\.org/.* refused: 'bad'"),
    ):
        client.get_json(URL, {}, check=mediawiki_error)
    assert len(seen) == 1
    assert list(tmp_path.iterdir()) == []


def test_mediawiki_error_reads_the_error_format() -> None:
    assert mediawiki_error([]) is mediawiki_error({"query": {}}) is None
    assert mediawiki_error({"error": "odd"}) == Refusal("Wikimedia refused: None")
    assert mediawiki_error(MAXLAG) == Refusal("Wikimedia refused: 'maxlag'", True)


def test_without_the_cache_a_request_is_always_sent_and_not_kept(
    tmp_path: Path,
) -> None:
    handler, seen = _replies(
        httpx.Response(200, json={"n": 1}),
        httpx.Response(200, json={"n": 2}),
        httpx.Response(200, json={"n": 3}),
    )
    with _client(tmp_path, handler, FakeTime()) as client:
        assert client.get_json(URL, {}) == {"n": 1}
        cached = list(tmp_path.iterdir())
        assert client.get_json(URL, {}, cache=False) == {"n": 2}
        assert client.get_json(URL, {}, cache=False) == {"n": 3}
    assert len(seen) == 3
    assert list(tmp_path.iterdir()) == cached


def test_bytes_are_downloaded_after_back_off_and_never_cached(tmp_path: Path) -> None:
    handler, seen = _replies(httpx.Response(503), httpx.Response(200, content=b"img"))
    fake = FakeTime()
    with _client(tmp_path, handler, fake) as client:
        assert client.get_bytes(IMAGE, max_bytes=3) == b"img"
    assert len(seen) == 2
    assert seen[0].headers["User-Agent"] == USER_AGENT
    assert fake.sleeps
    assert list(tmp_path.iterdir()) == []


def test_a_download_over_the_size_limit_fails(tmp_path: Path) -> None:
    handler, seen = _replies(httpx.Response(200, content=iter([b"fo", b"ur"])))
    with (
        _client(tmp_path, handler, FakeTime()) as client,
        pytest.raises(FetchError, match=r"Photo\.jpg is larger than 3 bytes"),
    ):
        client.get_bytes(IMAGE, max_bytes=3)
    assert len(seen) == 1


def test_a_download_off_the_allow_list_fails_unsent(tmp_path: Path) -> None:
    handler, seen = _replies(httpx.Response(200, content=b"img"))
    with (
        _client(tmp_path, handler, FakeTime()) as client,
        pytest.raises(FetchError, match="is not an allowed source"),
    ):
        client.get_bytes("https://example.org/a.jpg", max_bytes=10)
    assert seen == []


def test_the_client_counts_each_request_sent_but_not_a_cached_reply(
    tmp_path: Path,
) -> None:
    handler, _ = _replies(httpx.Response(503), httpx.Response(200, json={"n": 1}))
    with _client(tmp_path, handler, FakeTime()) as client:
        assert client.requests == 0
        client.get_json(URL, {})
        client.get_json(URL, {})
        assert client.requests == 2
