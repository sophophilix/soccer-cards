"""The query layer: the only code that talks to the database.

It has no write method. Every statement must be one `SELECT`, and values go in
as bound parameters (ADR 0008 D4).
"""

import re
from typing import Any, Protocol


class Statement(Protocol):
    """The part of a D1 prepared statement this layer uses."""

    def bind(self, *params: Any) -> "Statement":
        """Bind values to the statement's `?` placeholders."""
        ...

    async def first(self) -> Any:
        """Run the statement and return its first row, or nothing."""
        ...


class Database(Protocol):
    """The part of the D1 binding this layer uses."""

    def prepare(self, sql: str) -> Statement:
        """Prepare one SQL statement."""
        ...


class WriteRefusedError(ValueError):
    """Raised for any statement that is not a single `SELECT`."""


class DatabaseError(RuntimeError):
    """Raised when the database fails. It carries no database detail."""


_SELECT = re.compile(r"\s*select\b", re.IGNORECASE)


def _is_single_select(sql: str) -> bool:
    # A semicolon could start a second statement, so none is allowed except
    # one at the very end.
    return bool(_SELECT.match(sql)) and ";" not in sql.rstrip().rstrip(";")


class ReadOnlyQueries:
    """Runs `SELECT` statements against a D1 binding."""

    def __init__(self, database: Database) -> None:
        """Wrap a D1 binding."""
        self._database = database

    async def select_one(
        self, sql: str, params: tuple[Any, ...]
    ) -> dict[str, Any] | None:
        """Return the first row of a `SELECT` as a dict, or None.

        Args:
            sql: One `SELECT` statement with `?` placeholders.
            params: The values to bind.

        Raises:
            WriteRefusedError: If `sql` is anything but a single `SELECT`.
            DatabaseError: If the database fails.
        """
        if not _is_single_select(sql):
            msg = "Only a single SELECT statement is allowed."
            raise WriteRefusedError(msg)
        try:
            result = await self._database.prepare(sql).bind(*params).first()
        except Exception as exc:  # the database boundary: hide its detail
            msg = "The database request failed."
            raise DatabaseError(msg) from exc
        if not result:
            return None
        # A D1 row is a JavaScript object in the Worker and a dict in tests.
        to_py = getattr(result, "to_py", None)
        row = to_py() if callable(to_py) else result
        return dict(row)
