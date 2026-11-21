"""The error body of every failed request (AIP-193)."""

from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ErrorBody(BaseModel):
    """The `error` object."""

    code: int
    message: str
    status: str


class ErrorResponse(BaseModel):
    """The whole body of a failed request."""

    error: ErrorBody


class ApiError(Exception):
    """A failure with a status the caller should see."""

    def __init__(self, code: int, status: str, message: str) -> None:
        """Describe the failure."""
        super().__init__(message)
        self.code = code
        self.status = status
        self.message = message


def internal_error() -> JSONResponse:
    """Build the only 500 response. Its message is fixed, so no detail leaks."""
    return error_response(500, "INTERNAL", "Something went wrong. Try again later.")


def error_response(code: int, status: str, message: str) -> JSONResponse:
    """Build the AIP-193 response for a failure."""
    body = ErrorResponse(error=ErrorBody(code=code, message=message, status=status))
    return JSONResponse(status_code=code, content=body.model_dump())
