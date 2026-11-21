import pytest
from fastapi.testclient import TestClient
from starlette.requests import Request

from soccer_cards_api.app import create_app, database_from_scope
from soccer_cards_api.players import is_valid_player_id
from tests.fakes import FakeD1

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
    assert response.json() == {
        "error": {
            "code": 500,
            "message": "Something went wrong. Try again later.",
            "status": "INTERNAL",
        }
    }
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


@pytest.mark.parametrize("player_id", ["..", "a/b", "a" * 64, "Ada"])
def test_slug_rule_refuses_what_adr_0005_refuses(player_id: str) -> None:
    assert not is_valid_player_id(player_id)


def test_unknown_route_uses_the_same_error_shape(client: TestClient) -> None:
    response = client.get("/api/v2/nothing")

    assert response.status_code == 404
    assert response.json()["error"]["status"] == "NOT_FOUND"
