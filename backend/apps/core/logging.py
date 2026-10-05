"""Logging helpers: request-id injection, log-injection protection, key=value fields."""

import logging

from apps.core.request_context import get_request_id


class RequestIdFilter(logging.Filter):
    """Adds ``record.request_id`` so the formatter can print it on every line."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_request_id() or "-"
        return True


def escape_newlines(value: str) -> str:
    return value.replace("\r", "\\r").replace("\n", "\\n")


class SafeFormatter(logging.Formatter):
    """Escapes CR/LF in the message so one call can only ever produce one log line.

    Tracebacks (``exc_info``) are appended afterwards by the base class and stay
    multi-line. They are server-side only and never sent to clients.
    """

    def formatMessage(self, record: logging.LogRecord) -> str:
        record.message = escape_newlines(record.message)
        return super().formatMessage(record)


def kv(**fields: object) -> str:
    """Render ``op=x event=EVT-1001`` style fields, skipping ``None`` values.

    Only identifiers and outcomes are passed in here, never submitted text or
    anything about the visitor.
    """
    parts = []
    for key, value in fields.items():
        if value is None:
            continue
        text = str(value)
        if not text or any(ch.isspace() for ch in text):
            text = '"' + text.replace('"', '\\"') + '"'
        parts.append(f"{key}={text}")
    return " ".join(parts)
