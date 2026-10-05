"""HTTP contract for registration: 201 / 404 / 409 with stable error codes."""

from datetime import timedelta

import pytest

from apps.events.models import EventStatus

pytestmark = pytest.mark.django_db


def register(api, event):
    return api.post(f"/api/v1/events/{event.reference}/registrations/")


def test_registration_succeeds_with_201_and_a_receipt(api, make_event, fill):
    event = make_event(capacity=5)
    fill(event, 3)
    response = register(api, event)
    assert response.status_code == 201
    body = response.json()
    assert body["id"].startswith("REG-")
    assert body["event_id"] == event.reference
    assert (body["registered_count"], body["spots_remaining"]) == (4, 1)


def test_unpublished_event_is_409_event_not_published(api, make_event):
    response = register(api, make_event(status=EventStatus.PENDING_REVIEW))
    assert response.status_code == 409
    assert response.json()["code"] == "EVENT_NOT_PUBLISHED"


def test_full_event_is_409_event_full_with_the_briefs_message(api, make_event, fill):
    event = make_event(capacity=2)
    fill(event, 2)
    response = register(api, event)
    assert response.status_code == 409
    assert response.json()["code"] == "EVENT_FULL"
    assert response.json()["message"] == (
        "Registration is no longer available because this event is full."
    )


def test_started_event_is_409_registration_closed(api, make_event, now):
    response = register(api, make_event(starts_at=now - timedelta(hours=1)))
    assert response.status_code == 409
    assert response.json()["code"] == "REGISTRATION_CLOSED"


@pytest.mark.parametrize("reference", ["EVT-99999", "nonsense"])
def test_unknown_event_is_404(api, db, reference):
    response = api.post(f"/api/v1/events/{reference}/registrations/")
    assert response.status_code == 404
    assert response.json()["code"] == "EVENT_NOT_FOUND"


def test_get_on_registrations_is_not_allowed(api, make_event):
    """Registrations are write-only: nobody can list who registered."""
    response = api.get(f"/api/v1/events/{make_event().reference}/registrations/")
    assert response.status_code == 405
