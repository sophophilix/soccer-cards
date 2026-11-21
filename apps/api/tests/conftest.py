"""Shared fixtures: an in-memory stand-in for the D1 binding."""

from collections.abc import Iterator
from pathlib import Path

import pytest

from tests.fakes import FakeD1

API_ROOT = Path(__file__).resolve().parent.parent
MIGRATIONS = API_ROOT / "migrations"
LOCAL_SEED = API_ROOT / "seeds" / "local.sql"


def migrated_d1(*, seeded: bool = True, fail: bool = False) -> FakeD1:
    """Build a stand-in whose database is the real migrations, then the seed."""
    db = FakeD1(fail=fail)
    # The stand-in ships a one-column spike table. Replace it with the real one.
    db.conn.execute("DROP TABLE players")
    for migration in sorted(MIGRATIONS.glob("*.sql")):
        db.conn.executescript(migration.read_text())
    if seeded:
        db.conn.executescript(LOCAL_SEED.read_text())
    return db


@pytest.fixture
def d1() -> Iterator[FakeD1]:
    db = migrated_d1()
    yield db
    db.conn.close()


@pytest.fixture
def d1_migrated() -> Iterator[FakeD1]:
    """The migrations only, with no rows."""
    db = migrated_d1(seeded=False)
    yield db
    db.conn.close()
