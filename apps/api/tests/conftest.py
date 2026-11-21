"""Shared fixtures: an in-memory stand-in for the D1 binding."""

from collections.abc import Iterator
from pathlib import Path

import pytest

from tests.fakes import FakeD1

MIGRATIONS = Path(__file__).resolve().parent.parent / "migrations"


def migrated_d1(*, fail: bool = False) -> FakeD1:
    """Build a stand-in whose database is the real migrations, applied in order."""
    db = FakeD1(fail=fail)
    # The stand-in ships a one-column spike table. Replace it with the real one.
    db.conn.execute("DROP TABLE players")
    for migration in sorted(MIGRATIONS.glob("*.sql")):
        db.conn.executescript(migration.read_text())
    return db


@pytest.fixture
def d1() -> Iterator[FakeD1]:
    db = migrated_d1()
    yield db
    db.conn.close()
