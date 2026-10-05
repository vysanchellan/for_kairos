"""Shared pytest fixtures: demo principals, an event factory and a pinned clock."""

from datetime import datetime, timedelta, timezone

import pytest
from rest_framework.test import APIClient

from apps.core.auth import Principal, Role
from apps.events.models import Event, EventStatus
from apps.registrations.models import Registration

FIXED_NOW = datetime(2030, 6, 1, 12, 0, tzinfo=timezone.utc)


@pytest.fixture
def now(monkeypatch) -> datetime:
    """Pin ``apps.core.clock.now`` so time-based rules are deterministic."""
    monkeypatch.setattr("apps.core.clock.now", lambda: FIXED_NOW)
    return FIXED_NOW


@pytest.fixture
def visitor() -> Principal:
    return Principal(role=Role.VISITOR)


@pytest.fixture
def admin() -> Principal:
    return Principal(role=Role.ADMIN)


@pytest.fixture
def organiser() -> Principal:
    return Principal(role=Role.ORGANISER, organiser_id="organiser-1")


@pytest.fixture
def other_organiser() -> Principal:
    return Principal(role=Role.ORGANISER, organiser_id="organiser-2")


@pytest.fixture
def make_event(now):
    """Create an event directly (bypassing services) in whatever state a test needs."""

    def _make(**overrides) -> Event:
        fields = {
            "title": "Community Repair Café",
            "description": "Bring something broken.",
            "starts_at": now + timedelta(days=7),
            "capacity": 10,
            "status": EventStatus.PUBLISHED,
            "organiser_id": "organiser-1",
        }
        fields.update(overrides)
        return Event.objects.create(**fields)

    return _make


@pytest.fixture
def fill():
    """Add ``n`` registrations to an event."""

    def _fill(event: Event, n: int) -> None:
        Registration.objects.bulk_create(Registration(event=event) for _ in range(n))

    return _fill


@pytest.fixture
def api() -> APIClient:
    return APIClient(SERVER_NAME="localhost")


@pytest.fixture
def as_role(api):
    """``as_role("admin")`` / ``as_role("organiser", "organiser-2")`` -> a client sending demo headers."""

    def _as(role: str, organiser_id: str | None = None) -> APIClient:
        headers = {"HTTP_X_DEMO_ROLE": role}
        if organiser_id:
            headers["HTTP_X_DEMO_ORGANISER_ID"] = organiser_id
        api.credentials(**headers)
        return api

    return _as
