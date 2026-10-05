"""Cross-cutting guarantees: one error shape, no leaked internals, request ids in headers and logs."""

import logging

import pytest
from django.db import OperationalError

from apps.core.logging import RequestIdFilter, SafeFormatter, kv

pytestmark = pytest.mark.django_db

LEAKY = 'File "C:\\secret\\settings.py", line 1: SELECT * FROM events_event WHERE password=hunter2'


@pytest.fixture
def capture_logs(caplog):
    caplog.handler.addFilter(RequestIdFilter())
    caplog.set_level(logging.INFO)
    return caplog


def test_unexpected_errors_return_a_generic_500_without_internals(api, monkeypatch, capture_logs):
    def explode(**kwargs):
        raise RuntimeError(LEAKY)

    monkeypatch.setattr("apps.events.selectors.list_public_events", explode)
    response = api.get("/api/v1/events/", HTTP_X_REQUEST_ID="force-500-test")

    assert response.status_code == 500
    body = response.json()
    assert body == {
        "code": "INTERNAL_ERROR",
        "message": "Something went wrong on our side. Please try again.",
        "request_id": "force-500-test",
    }
    for secret in ("Traceback", "RuntimeError", "SELECT", "settings.py", "hunter2", "C:\\"):
        assert secret not in response.content.decode()

    # ...but the full details *are* in the server log, tagged with the request id.
    error = next(r for r in capture_logs.records if r.levelno == logging.ERROR)
    assert error.exc_info is not None
    assert error.request_id == "force-500-test"


def test_database_outage_is_a_503(api, monkeypatch):
    def unavailable(**kwargs):
        raise OperationalError("unable to open database file C:\\data\\db.sqlite3")

    monkeypatch.setattr("apps.events.selectors.list_public_events", unavailable)
    response = api.get("/api/v1/events/")
    assert response.status_code == 503
    assert response.json()["code"] == "SERVICE_UNAVAILABLE"
    assert "sqlite" not in response.content.decode()


def test_unknown_urls_get_the_same_json_shape(api):
    response = api.get("/api/v1/does-not-exist/")
    assert response.status_code == 404
    assert response.json()["code"] == "NOT_FOUND"


def test_caller_request_id_is_echoed_and_present_in_logs(api, make_event, capture_logs):
    event = make_event()
    response = api.post(
        f"/api/v1/events/{event.reference}/registrations/", HTTP_X_REQUEST_ID="demo-trace-0001"
    )
    assert response["X-Request-ID"] == "demo-trace-0001"

    ours = [r for r in capture_logs.records if r.request_id == "demo-trace-0001"]
    messages = [r.getMessage().split(" ")[0:2] for r in ours]
    # The workflow from brief section 7.5, in order:
    assert [m for m in messages if m[0] in {"request", "event", "registration", "activity"}] == [
        ["request", "received"],
        ["registration", "requested"],
        ["event", "validated"],
        ["registration", "stored"],
        ["activity", "recorded"],
        ["registration", "completed"],
        ["request", "completed"],
    ]


def test_a_request_id_is_generated_when_missing_or_unsafe(api):
    generated = api.get("/api/v1/health/")["X-Request-ID"]
    assert len(generated) == 16

    unsafe = api.get("/api/v1/health/", HTTP_X_REQUEST_ID="evil\nINFO fake log line")
    assert unsafe["X-Request-ID"] != "evil\nINFO fake log line"


def test_logs_never_contain_newlines_from_values():
    formatter = SafeFormatter("%(message)s")
    record = logging.LogRecord("t", logging.INFO, __file__, 1, "title=%s", ("a\nFORGED",), None)
    assert formatter.format(record) == "title=a\\nFORGED"


def test_kv_quotes_values_with_spaces_and_skips_none():
    assert kv(op="x", event=None, note="two words") == 'op=x note="two words"'


def test_registration_logs_contain_no_client_details(api, make_event, capture_logs):
    event = make_event()
    api.post(
        f"/api/v1/events/{event.reference}/registrations/",
        HTTP_USER_AGENT="SecretBrowser/1.0",
        REMOTE_ADDR="203.0.113.9",
    )
    text = "\n".join(r.getMessage() for r in capture_logs.records)
    assert "203.0.113.9" not in text
    assert "SecretBrowser" not in text


def test_invalid_demo_role_is_a_401(api):
    response = api.get("/api/v1/health/", HTTP_X_DEMO_ROLE="superuser")
    assert response.status_code == 401
    assert response.json()["code"] == "INVALID_DEMO_ROLE"


def test_health_reports_database_ok(api):
    assert api.get("/api/v1/health/").json() == {"status": "ok", "database": "ok"}


def test_security_headers_are_set(api):
    response = api.get("/api/v1/health/")
    assert response["X-Content-Type-Options"] == "nosniff"
    assert "default-src 'none'" in response["Content-Security-Policy"]
    assert response["X-Frame-Options"] == "DENY"
