from importlib.metadata import version

import pytest

from soccer_cards_data.cli import main


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
