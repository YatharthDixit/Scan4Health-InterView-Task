"""Single funnel that turns every exception into the one error envelope:

    {"error": {"code": ..., "detail": ..., "extra": {...}}}

Registered once in settings; no view contains error-formatting code.
"""

import logging

from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_handler

from .exceptions import ApiError

logger = logging.getLogger("api")


def _envelope(code: str, detail: str, extra: dict | None = None) -> dict:
    body = {"error": {"code": code, "detail": detail}}
    if extra:
        body["error"]["extra"] = extra
    return body


def api_exception_handler(exc, context):
    response = drf_handler(exc, context)

    if response is None:
        # Unhandled bug: log the traceback, return an opaque 500.
        logger.exception("Unhandled API error", exc_info=exc)
        return Response(
            _envelope("internal_error", "Something went wrong on our end."),
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if isinstance(exc, ApiError):
        response.data = _envelope(exc.default_code, str(exc.detail), exc.extra)
    elif isinstance(exc, exceptions.ValidationError):
        response.data = _envelope(
            "validation_error", "Invalid input.", {"fields": exc.detail}
        )
    elif isinstance(exc, (Http404, exceptions.NotFound)):
        response.data = _envelope("not_found", "Not found.")
    elif isinstance(exc, exceptions.MethodNotAllowed):
        response.data = _envelope("method_not_allowed", str(exc.detail))
    else:
        response.data = _envelope(
            getattr(exc, "default_code", "error"), str(exc.detail)
        )
    return response
