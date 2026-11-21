"""Shared fixtures: an in-memory stand-in for the D1 binding."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from starlette.requests import Request

from soccer_cards_api.app import create_app
from tests.fakes import FakeD1


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
def d1() -> Iterator[FakeD1]:
    db = FakeD1()
    yield db
    db.conn.close()


def _client(db: FakeD1) -> TestClient:
    def database_for(_request: Request) -> FakeD1:
        return db

    return TestClient(create_app(database_for), raise_server_exceptions=False)


@pytest.fixture
def client(d1: FakeD1) -> TestClient:
    return _client(d1)


@pytest.fixture
def failing_client() -> Iterator[TestClient]:
    db = FakeD1(fail=True)
    yield _client(db)
    db.conn.close()
