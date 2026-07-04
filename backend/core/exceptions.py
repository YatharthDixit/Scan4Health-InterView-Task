"""Deliberate API errors.

Every non-2xx response this API produces on purpose is raised as an
ApiError subclass and formatted by core.exception_handler — nothing
else in the codebase builds an error response by hand.
"""

from rest_framework import status
from rest_framework.exceptions import APIException


class ApiError(APIException):
    """Base for all deliberate API errors: code + detail + optional extra."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "bad_request"
    default_detail = "Bad request."

    def __init__(self, detail: str | None = None, extra: dict | None = None):
        super().__init__(detail=detail or self.default_detail)
        self.extra = extra or {}


class InvalidTransitionError(ApiError):
    """The requested status change is not allowed from the current status."""

    status_code = status.HTTP_409_CONFLICT
    default_code = "invalid_transition"

    def __init__(self, current: str, target: str, allowed):
        super().__init__(
            detail=f"Cannot move submission from '{current}' to '{target}'.",
            extra={
                "current_status": current,
                "allowed_transitions": sorted(allowed),
            },
        )


class InvalidStatusValueError(ApiError):
    """The supplied value is not a status at all."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "invalid_status_value"

    def __init__(self, value, valid):
        super().__init__(
            detail=f"'{value}' is not a valid status.",
            extra={"valid_statuses": sorted(valid)},
        )
