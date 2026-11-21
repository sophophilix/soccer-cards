"""The FastAPI app."""

from collections.abc import Callable
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from soccer_cards_api.errors import ApiError, error_response, internal_error
from soccer_cards_api.players import Player, PlayerRepository, is_valid_player_id
from soccer_cards_api.queries import (
    Database,
    DatabaseError,
    ReadOnlyQueries,
    WriteRefusedError,
)

DatabaseFor = Callable[[Request], Database]

_STATUS_NAMES = {
    400: "INVALID_ARGUMENT",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
}


def database_from_scope(request: Request) -> Database:
    """Return the D1 binding `DB` that the Worker puts in the request scope."""
    env: Any = request.scope["env"]
    database: Database = env.DB
    return database


def create_app(database_for: DatabaseFor = database_from_scope) -> FastAPI:
    """Build the app.

    Args:
        database_for: Finds the D1 binding for a request. Tests pass a stand-in.
    """
    # ADR 0003: no telemetry leaves the API. FastAPI's native OpenTelemetry is
    # off, each part set explicitly so a default change cannot turn it on.
    app = FastAPI(
        title="Soccer Cards API",
        version="2",
        telemetry={
            "tracing": False,
            "metrics": False,
            "logs": False,
            "operation_spans": False,
            "auto_configure": False,
        },
    )

    @app.exception_handler(ApiError)
    async def _api_error(_request: Request, exc: ApiError) -> JSONResponse:
        return error_response(exc.code, exc.status, exc.message)

    @app.exception_handler(StarletteHTTPException)
    async def _http(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
        status = _STATUS_NAMES.get(exc.status_code, "UNKNOWN")
        message = (
            "The resource was not found."
            if exc.status_code == 404
            else "The request failed."
        )
        return error_response(exc.status_code, status, message)

    # Every database failure and every unexpected error is the one fixed 500.
    # The handlers never read the exception, so its cause is not shown or logged.
    @app.exception_handler(DatabaseError)
    async def _database(_request: Request, _exc: DatabaseError) -> JSONResponse:
        return internal_error()

    @app.exception_handler(WriteRefusedError)
    async def _write_refused(
        _request: Request, _exc: WriteRefusedError
    ) -> JSONResponse:
        return internal_error()

    @app.exception_handler(Exception)
    async def _unexpected(_request: Request, _exc: Exception) -> JSONResponse:
        return internal_error()

    @app.get(
        "/api/v2/players/{player:path}",
        response_model=Player,
        response_model_by_alias=True,
    )
    async def get_player(player: str, request: Request) -> Player:
        if not is_valid_player_id(player):
            msg = "The player id must be a lowercase slug of at most 63 characters."
            raise ApiError(400, "INVALID_ARGUMENT", msg)
        repository = PlayerRepository(ReadOnlyQueries(database_for(request)))
        found = await repository.get(player)
        if found is None:
            raise ApiError(404, "NOT_FOUND", f"Player players/{player} was not found.")
        return found

    return app
