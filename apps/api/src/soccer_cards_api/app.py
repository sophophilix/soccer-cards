"""The FastAPI app."""

from collections.abc import Callable
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from soccer_cards_api.errors import ApiError, error_response
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
_INTERNAL = (500, "INTERNAL", "Something went wrong. Try again later.")


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
    app = FastAPI(title="Soccer Cards API", version="2")

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

    @app.exception_handler(Exception)
    async def _unexpected(_request: Request, _exc: Exception) -> JSONResponse:
        return error_response(*_INTERNAL)

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
        try:
            found = await repository.get(player)
        except (DatabaseError, WriteRefusedError) as exc:
            raise ApiError(*_INTERNAL) from exc
        if found is None:
            raise ApiError(404, "NOT_FOUND", f"Player players/{player} was not found.")
        return found

    return app
