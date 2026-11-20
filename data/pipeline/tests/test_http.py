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
    return PoliteClient(
        tmp_path,
        transport=httpx.MockTransport(handler),
        clock=fake.clock,
        sleep=fake.sleep,
    )


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


def test_honours_retry_after_on_429(tmp_path: Path) -> None:
    handler, seen = _replies(
        httpx.Response(429, headers={"Retry-After": "7"}),
        httpx.Response(200, json={}),
    )
    fake = FakeTime()
    with _client(tmp_path, handler, fake) as client:
        client.get_json(URL, {})
    assert len(seen) == 2
    assert fake.sleeps[0] == 7


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


def test_gives_up_after_a_fixed_number_of_tries_naming_the_url(
    tmp_path: Path,
) -> None:
    handler, seen = _replies(*[httpx.Response(500) for _ in range(MAX_TRIES)])
    with (
        _client(tmp_path, handler, FakeTime()) as client,
        pytest.raises(FetchError, match=r"w/api\.php\?ids=Q9 after 4 tries"),
    ):
        client.get_json(URL, {"ids": "Q9"})
    assert len(seen) == MAX_TRIES


@pytest.mark.parametrize(
    "response",
    [
        httpx.Response(404),
        httpx.Response(429, headers={"Retry-After": "Fri, 01 Jan 2100 00:00:00 GMT"}),
        httpx.Response(200, text="<html>not json</html>"),
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
