import logging
import re
import time
import uuid

from apps.core.logging import kv
from apps.core.request_context import request_id_var

logger = logging.getLogger("apps.request")

REQUEST_ID_HEADER = "X-Request-ID"
# Accept a caller's id only if it is short and boring; anything else could be
# used to smuggle text into our logs, so we generate a fresh one instead.
_VALID_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{8,64}$")


class RequestIdMiddleware:
    """Accepts or generates a request id, exposes it to logging, echoes it back.

    It also logs one line when a request is received and one when it completes.
    Only the method, path, status and duration are logged: no query string,
    body, IP address or user agent.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        incoming = request.headers.get(REQUEST_ID_HEADER, "")
        request_id = incoming if _VALID_REQUEST_ID.match(incoming) else uuid.uuid4().hex[:16]
        request.request_id = request_id
        token = request_id_var.set(request_id)
        started = time.perf_counter()
        try:
            logger.info("request received %s", kv(method=request.method, path=request.path))
            response = self.get_response(request)
            duration_ms = round((time.perf_counter() - started) * 1000, 1)
            log = logger.warning if response.status_code >= 500 else logger.info
            log(
                "request completed %s",
                kv(
                    method=request.method,
                    path=request.path,
                    status=response.status_code,
                    duration_ms=duration_ms,
                ),
            )
            response[REQUEST_ID_HEADER] = request_id
            return response
        finally:
            request_id_var.reset(token)


class SecurityHeadersMiddleware:
    """Content-Security-Policy for API responses.

    JSON responses never need to load anything, so they get a deny-all policy.
    The Swagger UI page needs its CDN assets and inline bootstrap script.
    """

    API_POLICY = "default-src 'none'; frame-ancestors 'none'"
    DOCS_POLICY = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "img-src 'self' data: https://cdn.jsdelivr.net; "
        "connect-src 'self'; frame-ancestors 'none'"
    )

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        policy = self.DOCS_POLICY if request.path.startswith("/api/docs") else self.API_POLICY
        response.setdefault("Content-Security-Policy", policy)
        return response
