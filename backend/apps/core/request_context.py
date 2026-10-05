"""The request id for the request currently being handled.

A ``ContextVar`` (rather than a thread-local) is correct for both sync and
async code: every request, and every thread or task it runs on, sees its own
value.
"""

from contextvars import ContextVar

request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)


def get_request_id() -> str | None:
    return request_id_var.get()
