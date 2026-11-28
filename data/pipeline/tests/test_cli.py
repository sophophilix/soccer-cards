import re
from importlib.metadata import version

import pytest

from soccer_cards_data import build
from soccer_cards_data.cli import main
from soccer_cards_data.http import FetchError, PoliteClient


def test_version_prints_package_version_and_exits_0(
    capsys: pytest.CaptureFixture[str],
) -> None:
    with pytest.raises(SystemExit) as exit_info:
        main(["--version"])

    assert exit_info.value.code == 0
    expected = f"scdata {version('soccer-cards-data')}"
    assert capsys.readouterr().out.strip() == expected


def test_no_command_prints_usage_to_stderr_and_exits_2(
    capsys: pytest.CaptureFixture[str],
) -> None:
    with pytest.raises(SystemExit) as exit_info:
        main([])

    assert exit_info.value.code == 2
    captured = capsys.readouterr()
    assert captured.out == ""
    assert captured.err.startswith("usage: scdata")


def test_unknown_command_prints_usage_to_stderr_and_exits_2(
    capsys: pytest.CaptureFixture[str],
) -> None:
    with pytest.raises(SystemExit) as exit_info:
        main(["launch"])

    assert exit_info.value.code == 2
    captured = capsys.readouterr()
    assert captured.out == ""
    assert captured.err.startswith("usage: scdata")
    assert "launch" in captured.err


def test_build_reports_what_it_dropped_and_exits_0(
    capsys: pytest.CaptureFixture[str], monkeypatch: pytest.MonkeyPatch
) -> None:
    def fake(client: PoliteClient, *, now: str) -> tuple[str, ...]:
        assert re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ", now)
        return ("Q1: avatar, 'no photo'",)

    monkeypatch.setattr(build, "build", fake)

    with pytest.raises(SystemExit) as exit_info:
        main(["build"])

    assert exit_info.value.code == 0
    assert capsys.readouterr().err.startswith("scdata: Q1: avatar, 'no photo'\n")


@pytest.mark.parametrize(
    "error",
    [build.BuildError("no players"), FetchError("HTTP 404"), ValueError("not plain")],
)
def test_a_failed_build_exits_1_and_says_the_output_is_unchanged(
    capsys: pytest.CaptureFixture[str],
    monkeypatch: pytest.MonkeyPatch,
    error: Exception,
) -> None:
    def fake(client: PoliteClient, *, now: str) -> tuple[str, ...]:
        raise error

    monkeypatch.setattr(build, "build", fake)

    with pytest.raises(SystemExit) as exit_info:
        main(["build"])

    assert exit_info.value.code == 1
    err = capsys.readouterr().err
    assert err.startswith(f"scdata: build failed, output unchanged: {error}\n")


@pytest.mark.parametrize("fails", [False, True])
def test_build_says_how_many_requests_it_made_and_how_long_it_took(
    capsys: pytest.CaptureFixture[str],
    monkeypatch: pytest.MonkeyPatch,
    fails: bool,
) -> None:
    def fake(client: PoliteClient, *, now: str) -> tuple[str, ...]:
        client.requests = 7
        if fails:
            raise build.BuildError("no players")
        return ()

    monkeypatch.setattr(build, "build", fake)

    with pytest.raises(SystemExit) as exit_info:
        main(["build"])

    assert exit_info.value.code == int(fails)
    last = capsys.readouterr().err.splitlines()[-1]
    assert re.fullmatch(r"scdata: 7 requests in \d+\.\d s", last)


def test_check_prints_one_line_per_id_and_exits_1_when_one_fails(
    capsys: pytest.CaptureFixture[str], monkeypatch: pytest.MonkeyPatch
) -> None:
    def fake(client: PoliteClient, qids: list[str]) -> list[build.Check]:
        assert qids == ["Q1", "Q2"]
        return [
            build.Check("Q1", True, "Q1: ok ARG forward Inter Miami CF"),
            build.Check("Q2", False, "Q2: needs a usable position"),
        ]

    monkeypatch.setattr(build, "check_players", fake)

    with pytest.raises(SystemExit) as exit_info:
        main(["check", "Q1", "Q2"])

    assert exit_info.value.code == 1
    assert capsys.readouterr().out.splitlines() == [
        "Q1: ok ARG forward Inter Miami CF",
        "Q2: needs a usable position",
    ]


def test_check_exits_0_when_every_id_passes(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake(client: PoliteClient, qids: list[str]) -> list[build.Check]:
        return [build.Check("Q1", True, "Q1: ok ARG forward Inter Miami CF")]

    monkeypatch.setattr(build, "check_players", fake)

    with pytest.raises(SystemExit) as exit_info:
        main(["check", "Q1"])

    assert exit_info.value.code == 0


def test_check_needs_at_least_one_id() -> None:
    with pytest.raises(SystemExit) as exit_info:
        main(["check"])

    assert exit_info.value.code == 2
