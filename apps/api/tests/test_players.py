from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from starlette.requests import Request

from soccer_cards_api.app import create_app, database_from_scope
from tests.conftest import migrated_d1
from tests.fakes import FakeD1


def _client(db: FakeD1) -> TestClient:
    def database_for(_request: Request) -> FakeD1:
        return db

    return TestClient(create_app(database_for), raise_server_exceptions=False)


@pytest.fixture
def client(d1: FakeD1) -> TestClient:
    return _client(d1)


@pytest.fixture
def failing_client() -> Iterator[TestClient]:
    db = migrated_d1(fail=True)
    yield _client(db)
    db.conn.close()


ADA = {
    "name": "players/ada-vale",
    "displayName": "Ada Vale",
    "position": "FORWARD",
    "tier": "ICON",
    "overall": 94,
}


def test_known_player_returns_its_resource(client: TestClient) -> None:
    response = client.get("/api/v2/players/ada-vale")

    assert response.status_code == 200
    assert response.json() == ADA


def test_fields_are_camel_case(client: TestClient) -> None:
    body = client.get("/api/v2/players/bruno-quill").json()

    assert "displayName" in body
    assert "display_name" not in body


def test_unknown_player_is_a_404_in_the_aip_193_shape(client: TestClient) -> None:
    response = client.get("/api/v2/players/nobody-here")

    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": 404,
            "message": "Player players/nobody-here was not found.",
            "status": "NOT_FOUND",
        }
    }


@pytest.mark.parametrize(
    "bad_id",
    ["Ada-Vale", "a%2Fb", "a..b", "1abc", "ada_vale", "a" * 64, "-ada"],
)
def test_bad_id_is_a_400_and_never_reaches_the_database(
    client: TestClient, d1: FakeD1, bad_id: str
) -> None:
    response = client.get(f"/api/v2/players/{bad_id}")

    assert response.status_code == 400
    error = response.json()["error"]
    assert error["code"] == 400
    assert error["status"] == "INVALID_ARGUMENT"
    assert isinstance(error["message"], str)
    assert d1.prepared == []


def test_longest_valid_id_reaches_the_database(client: TestClient) -> None:
    response = client.get("/api/v2/players/" + "a" * 63)

    assert response.status_code == 404


def test_database_failure_is_a_500_without_internal_detail(
    failing_client: TestClient,
) -> None:
    response = failing_client.get("/api/v2/players/ada-vale")

    assert response.status_code == 500
    assert response.json()["error"]["status"] == "INTERNAL"
    assert "secret" not in response.text


def test_missing_binding_is_a_500_without_internal_detail() -> None:
    response = TestClient(create_app(), raise_server_exceptions=False).get(
        "/api/v2/players/ada-vale"
    )

    assert response.status_code == 500
    assert response.json()["error"]["status"] == "INTERNAL"
    assert "env" not in response.text


def test_default_binding_is_env_db_from_the_request_scope() -> None:
    binding = object()
    env = type("Env", (), {"DB": binding})()

    assert database_from_scope(Request({"type": "http", "env": env})) is binding


def test_unknown_route_uses_the_same_error_shape(client: TestClient) -> None:
    response = client.get("/api/v2/nothing")

    assert response.status_code == 404
    assert response.json()["error"]["status"] == "NOT_FOUND"


def test_every_statement_sent_to_the_database_is_a_constant_select(
    client: TestClient, d1: FakeD1
) -> None:
    client.get("/api/v2/players/ada-vale")
    client.get("/api/v2/players/nobody-here")

    assert (
        d1.prepared
        == [
            "SELECT id, display_name, position, tier, overall FROM players WHERE id = ?"
        ]
        * 2
    )


def test_unexpected_exception_is_the_fixed_500_and_its_cause_is_not_logged(
    caplog: pytest.LogCaptureFixture,
) -> None:
    def database_for(_request: Request) -> FakeD1:
        msg = "secret internal detail"
        raise RuntimeError(msg)

    with caplog.at_level(0):
        response = TestClient(
            create_app(database_for), raise_server_exceptions=False
        ).get("/api/v2/players/ada-vale")

    assert response.json() == {
        "error": {
            "code": 500,
            "message": "Something went wrong. Try again later.",
            "status": "INTERNAL",
        }
    }
    assert "secret" not in response.text
    assert "secret" not in caplog.text


def test_database_failure_cause_is_not_logged(
    failing_client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(0):
        failing_client.get("/api/v2/players/ada-vale")

    assert "secret" not in caplog.text


def test_fastapi_telemetry_is_off() -> None:
    config = create_app()._telemetry

    assert not any(
        config[key]
        for key in ("tracing", "metrics", "logs", "operation_spans", "auto_configure")
    )
    assert config["tracer_provider"] is None
    assert config["meter_provider"] is None
    assert config["logger_provider"] is None
