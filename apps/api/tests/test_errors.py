import json

import pytest

from soccer_cards_api.errors import ApiError, error_response


@pytest.mark.parametrize(
    ("code", "status"),
    [(400, "INVALID_ARGUMENT"), (404, "NOT_FOUND"), (500, "INTERNAL")],
)
def test_error_body_is_the_aip_193_shape(code: int, status: str) -> None:
    response = error_response(code, status, "A readable message.")

    assert response.status_code == code
    assert json.loads(bytes(response.body)) == {
        "error": {"code": code, "message": "A readable message.", "status": status}
    }


def test_api_error_carries_its_code_status_and_message() -> None:
    error = ApiError(404, "NOT_FOUND", "Nobody here.")

    assert (error.code, error.status, error.message) == (
        404,
        "NOT_FOUND",
        "Nobody here.",
    )
    assert str(error) == "Nobody here."
