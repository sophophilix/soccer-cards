import sqlite3

import pytest

from tests.fakes import FakeD1


def test_migration_alone_holds_no_rows(d1_migrated: FakeD1) -> None:
    count = d1_migrated.conn.execute("SELECT count(*) FROM players").fetchone()[0]

    assert count == 0


def test_local_seed_adds_three_invented_players(d1: FakeD1) -> None:
    rows = d1.conn.execute(
        "SELECT id, display_name, position, tier, overall FROM players ORDER BY id"
    ).fetchall()

    assert [tuple(row) for row in rows] == [
        ("ada-vale", "Ada Vale", "FORWARD", "ICON", 94),
        ("bruno-quill", "Bruno Quill", "GOALKEEPER", "RARE", 81),
        ("cleo-marsh", "Cleo Marsh", "MIDFIELDER", "BASE", 67),
    ]


@pytest.mark.parametrize("bad_id", ["a/../x", "a<script>", 'a"onload=x', "Ada", "a b"])
def test_a_non_slug_id_is_refused(d1_migrated: FakeD1, bad_id: str) -> None:
    with pytest.raises(sqlite3.IntegrityError):
        d1_migrated.conn.execute(
            "INSERT INTO players VALUES (?, 'X', 'FORWARD', 'BASE', 50)", (bad_id,)
        )


@pytest.mark.parametrize(
    "bad_id", ["\x00ab", "a\x00<script>/../x", "ab\x00"], ids=["start", "middle", "end"]
)
def test_an_id_with_an_embedded_nul_is_refused(
    d1_migrated: FakeD1, bad_id: str
) -> None:
    with pytest.raises(sqlite3.IntegrityError):
        d1_migrated.conn.execute(
            "INSERT INTO players VALUES (?, 'X', 'FORWARD', 'BASE', 50)", (bad_id,)
        )
