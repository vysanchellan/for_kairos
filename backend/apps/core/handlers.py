"""Turns every failure into one JSON error shape.

    {"code": "EVENT_FULL", "message": "...", "fields": {...}?, "request_id": "..."}

``api_exception_handler`` is DRF's EXCEPTION_HANDLER, so it sees every
exception raised inside an API view. ``json_not_found`` and ``json_server_error``
cover failures that happen outside DRF (an unknown URL, or a crash in middleware).
Stack traces, SQL and file paths go to the server log only, never to the client.
"""

import logging

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.db import DatabaseError
from django.http import Http404, JsonResponse
from rest_framework import exceptions as drf
from rest_framework.response import Response
from rest_framework.views import set_rollback

from apps.core.exceptions import DomainError, ServiceUnavailable
from apps.core.logging import kv
from apps.core.request_context import get_request_id

logger = logging.getLogger("apps.errors")

GENERIC_500 = "Something went wrong on our side. Please try again."
NOT_FOUND_MESSAGE = "We couldn't find what you were looking for."

# DRF's built-in exceptions -> (our code, friendly message)
_DRF_ERRORS: dict[type[drf.APIException], tuple[str, str]] = {
    drf.ParseError: ("MALFORMED_REQUEST", "The request body could not be read as JSON."),
    drf.NotFound: ("NOT_FOUND", NOT_FOUND_MESSAGE),
    drf.MethodNotAllowed: ("METHOD_NOT_ALLOWED", "This action isn't supported here."),
    drf.UnsupportedMediaType: ("UNSUPPORTED_MEDIA_TYPE", "Requests must be sent as JSON."),
    drf.NotAcceptable: ("NOT_ACCEPTABLE", "This endpoint only returns JSON."),
}


def error_body(code: str, message: str, fields: dict | None = None) -> dict:
    body: dict = {"code": code, "message": message}
    if fields:
        body["fields"] = fields
    body["request_id"] = get_request_id()
    return body


def _flatten_validation_errors(detail) -> dict[str, str]:
    """``{"capacity": [ErrorDetail(...)]}`` -> ``{"capacity": "message"}`` (first message per field)."""
    if isinstance(detail, list):
        detail = {"non_field_errors": detail}
    fields: dict[str, str] = {}
    for name, errors in detail.items():
        if isinstance(errors, dict):  # nested serializer
            for sub, msg in _flatten_validation_errors(errors).items():
                fields[f"{name}.{sub}"] = msg
        elif isinstance(errors, list) and errors:
            fields[name] = str(errors[0])
        else:
            fields[name] = str(errors)
    return fields


def _upper_code(detail, fallback: str) -> str:
    """Our permission/auth classes use UPPER_CASE codes; DRF's defaults are lower_case."""
    code = getattr(detail, "code", "") or ""
    return code if code.isupper() else fallback


def api_exception_handler(exc, context):
    # Any open transaction must not commit a half-finished operation.
    set_rollback()

    if isinstance(exc, DomainError):
        log = logger.warning if exc.status_code < 500 else logger.error
        log("request rejected %s", kv(code=exc.code, status=exc.status_code))
        return Response(error_body(exc.code, exc.message, exc.fields), status=exc.status_code)

    if isinstance(exc, Http404):
        exc = drf.NotFound()
    elif isinstance(exc, DjangoPermissionDenied):
        exc = drf.PermissionDenied()

    if isinstance(exc, drf.ValidationError):
        fields = _flatten_validation_errors(exc.detail)
        logger.warning("validation failed %s", kv(code="VALIDATION_ERROR", fields=",".join(fields)))
        return Response(
            error_body("VALIDATION_ERROR", "Some details need fixing before we can continue.", fields),
            status=400,
        )

    if isinstance(exc, (drf.NotAuthenticated, drf.AuthenticationFailed)):
        code = _upper_code(exc.detail, "INVALID_DEMO_ROLE")
        logger.warning("authentication failed %s", kv(code=code, status=401))
        return Response(error_body(code, str(exc.detail)), status=401)

    if isinstance(exc, drf.PermissionDenied):
        code = _upper_code(exc.detail, "FORBIDDEN")
        logger.warning("request forbidden %s", kv(code=code, status=403))
        return Response(error_body(code, str(exc.detail)), status=403)

    if isinstance(exc, drf.APIException):
        code, message = _DRF_ERRORS.get(
            type(exc), (str(exc.default_code).upper(), str(exc.default_detail))
        )
        headers = {}
        if isinstance(exc, drf.MethodNotAllowed) and context.get("view") is not None:
            headers["Allow"] = ", ".join(context["view"].allowed_methods)
        return Response(error_body(code, message), status=exc.status_code, headers=headers)

    if isinstance(exc, DatabaseError):
        logger.exception("database error %s", kv(code=ServiceUnavailable.code, status=503))
        return Response(error_body(ServiceUnavailable.code, ServiceUnavailable.message), status=503)

    # Anything else is a bug: full details to the log, nothing to the client.
    logger.exception("unhandled error %s", kv(code="INTERNAL_ERROR", status=500))
    return Response(error_body("INTERNAL_ERROR", GENERIC_500), status=500)


def json_bad_request(request, exception=None):
    return JsonResponse(error_body("BAD_REQUEST", "The request could not be understood."), status=400)


def json_forbidden(request, exception=None):
    return JsonResponse(error_body("FORBIDDEN", "You don't have access to this."), status=403)


def json_not_found(request, exception=None):
    return JsonResponse(error_body("NOT_FOUND", NOT_FOUND_MESSAGE), status=404)


def json_server_error(request):
    return JsonResponse(error_body("INTERNAL_ERROR", GENERIC_500), status=500)
