from tests.fakes import FakeD1


def test_migration_seeds_three_invented_players(d1: FakeD1) -> None:
    rows = d1.conn.execute(
        "SELECT id, display_name, position, tier, overall FROM players ORDER BY id"
    ).fetchall()

    assert [tuple(row) for row in rows] == [
        ("ada-vale", "Ada Vale", "FORWARD", "ICON", 94),
        ("bruno-quill", "Bruno Quill", "GOALKEEPER", "RARE", 81),
        ("cleo-marsh", "Cleo Marsh", "MIDFIELDER", "BASE", 67),
    ]
