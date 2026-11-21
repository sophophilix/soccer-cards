import pytest

from soccer_cards_api.queries import ReadOnlyQueries, WriteRefusedError
from tests.fakes import FakeD1

pytestmark = pytest.mark.anyio


@pytest.mark.parametrize(
    "sql",
    [
        "INSERT INTO players (id) VALUES ('x')",
        "UPDATE players SET overall = 1",
        "DELETE FROM players",
        "DROP TABLE players",
        "  delete from players",
        "SELECT 1; DROP TABLE players",
        "WITH x AS (SELECT 1) DELETE FROM players",
        "",
    ],
)
async def test_anything_but_a_single_select_is_refused(d1: FakeD1, sql: str) -> None:
    queries = ReadOnlyQueries(d1)

    with pytest.raises(WriteRefusedError):
        await queries.select_one(sql, ())

    assert d1.prepared == []


async def test_select_binds_its_parameters(d1: FakeD1) -> None:
    queries = ReadOnlyQueries(d1)

    row = await queries.select_one("SELECT id FROM players WHERE id = ?", ("ada-vale",))

    assert row == {"id": "ada-vale"}


async def test_injection_text_is_bound_not_interpolated(d1: FakeD1) -> None:
    queries = ReadOnlyQueries(d1)

    row = await queries.select_one(
        "SELECT id FROM players WHERE id = ?", ("x' OR '1'='1",)
    )

    assert row is None


async def test_a_javascript_result_is_converted_to_python() -> None:
    class JsRow:
        def to_py(self) -> dict[str, int]:
            return {"n": 1}

    class Stmt:
        def bind(self, *_params: object) -> "Stmt":
            return self

        async def first(self) -> JsRow:
            return JsRow()

    class Db:
        def prepare(self, _sql: str) -> Stmt:
            return Stmt()

    assert await ReadOnlyQueries(Db()).select_one("SELECT 1", ()) == {"n": 1}
