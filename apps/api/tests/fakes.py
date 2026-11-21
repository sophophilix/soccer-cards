"""An in-memory stand-in for the D1 binding."""

import sqlite3
from pathlib import Path
from typing import Any

MIGRATIONS = Path(__file__).parent.parent / "migrations"


class FakeStatement:
    """A prepared statement with the shape of D1's `prepare().bind().first()`."""

    def __init__(self, conn: sqlite3.Connection, sql: str, fail: bool) -> None:
        self._conn = conn
        self._sql = sql
        self._fail = fail
        self.params: tuple[Any, ...] = ()

    def bind(self, *params: Any) -> "FakeStatement":
        self.params = params
        return self

    async def first(self) -> dict[str, Any] | None:
        if self._fail:
            msg = "D1_ERROR: secret internal detail"
            raise RuntimeError(msg)
        row = self._conn.execute(self._sql, self.params).fetchone()
        return None if row is None else dict(row)


class FakeD1:
    """An in-memory SQLite database seeded by the real migration files."""

    def __init__(self, *, fail: bool = False) -> None:
        self.conn = sqlite3.connect(":memory:", check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        for migration in sorted(MIGRATIONS.glob("*.sql")):
            self.conn.executescript(migration.read_text())
        self.fail = fail
        self.prepared: list[str] = []

    def prepare(self, sql: str) -> FakeStatement:
        self.prepared.append(sql)
        return FakeStatement(self.conn, sql, self.fail)
