from pathlib import Path

import pytest

from soccer_cards_data.grades import GradeFileError, load_grades, load_overrides
from soccer_cards_data.ratings import (
    GOALKEEPER_RATINGS,
    OUTFIELD_RATINGS,
    Position,
    compute_card,
)


def player(qid: str = "Q1", group: str = "outfield", **lines: str) -> str:
    names = OUTFIELD_RATINGS if group == "outfield" else GOALKEEPER_RATINGS
    body = [lines.get(n, f'{n} = [3, "Known for long passes"]') for n in names]
    body += [line for name, line in lines.items() if name not in names]
    return "\n".join([f"[{group}.{qid}]", *body, ""])


def write(tmp_path: Path, name: str, text: str) -> Path:
    (tmp_path / name).write_text(text, encoding="utf-8")
    return tmp_path / name


def test_the_real_files_load_and_feed_the_formula() -> None:
    players = load_grades()
    overrides = load_overrides(players)
    keepers = [p for p in players.values() if p.group == "goalkeeper"]
    assert (len(players), len(keepers)) == (24, 4)
    assert sum(o.tier == "ICON" for o in overrides.values()) >= 2
    for entry in players.values():
        keeper = entry.group == "goalkeeper"
        compute_card(Position.GOALKEEPER if keeper else Position.FORWARD, entry.grades)


@pytest.mark.parametrize(
    ("text", "error"),
    [
        (player(qid="X1"), "X1: must be a Wikidata Q-id"),
        (player(pace='pace = [6, "Fast"]'), "Q1.pace: must be a grade from 1 to 5"),
        (player(pace='pace = [0, "Fast"]'), "Q1.pace: must be a grade from 1 to 5"),
        (player(pace='pace = [true, "Fast"]'), "Q1.pace: must be"),
        (player(pace="pace = [3]"), "Q1.pace: must be"),
        (player(pace=""), "Q1: needs exactly the outfield grades"),
        (player(diving='diving = [3, "x"]'), "Q1: needs exactly the outfield"),
        (player(group="goalkeeper", pace="pace = [3, 'x']"), "exactly the goalkeeper"),
        (player(group="striker"), "striker: must be one of outfield, goalkeeper"),
        (player(pace='pace = [3, "  "]'), "Q1.pace: needs a reason"),
        (player(pace='pace = [3, "Fast <b>"]'), "Q1.pace: must be plain text"),
        (player(pace='pace = [3, "Fast\\nvery"]'), "Q1.pace: must be plain text"),
        (player(pace=f'pace = [3, "{"a" * 161}"]'), "Q1.pace: is longer than"),
        (player(pace='pace = [3, "Fast, 91"]'), "Q1.pace: has a number under 100"),
        (player(pace='pace = [3, "Scored 7 goals"]'), "Q1.pace: has a number"),
        (player(pace='pace = [3, "Fast in Ultimate Team"]'), "names a video game"),
        (player(pace='pace = [3, "Fast, says Panini"]'), "names a video game"),
        (player() + player(group="goalkeeper"), "Q1: is listed twice"),
        ("[outfield.Q1\n", "p.toml: is not valid TOML"),
    ],
)
def test_a_bad_grade_file_is_refused(tmp_path: Path, text: str, error: str) -> None:
    with pytest.raises(GradeFileError, match=error):
        load_grades(write(tmp_path, "p.toml", text))


@pytest.mark.parametrize(
    ("text", "error"),
    [
        ('Q2 = { tier = "ICON", reason = "Great" }', "Q2: is not in the grade file"),
        ('Q1 = { tier = "GOAT", reason = "Great" }', "Q1: must be one of BASE"),
        ('Q1 = { tier = "ICON" }', "Q1: must be { tier = ..., reason = ... }"),
        ('Q1 = { tier = "ICON", reason = "Great", x = 1 }', "Q1: must be {"),
        ('Q1 = { tier = "ICON", reason = "Top 10" }', "Q1: has a number"),
        ('Q01 = { tier = "ICON", reason = "Great" }', "Q01: must be a Wikidata"),
    ],
)
def test_a_bad_override_is_refused(tmp_path: Path, text: str, error: str) -> None:
    players = load_grades(write(tmp_path, "p.toml", player()))
    with pytest.raises(GradeFileError, match=error):
        load_overrides(players, write(tmp_path, "o.toml", text))


def test_a_good_override_loads_with_its_tier(tmp_path: Path) -> None:
    players = load_grades(write(tmp_path, "p.toml", player()))
    path = write(tmp_path, "o.toml", 'Q1 = { tier = "ICON", reason = "Great" }')
    assert load_overrides(players, path)["Q1"].tier == "ICON"
