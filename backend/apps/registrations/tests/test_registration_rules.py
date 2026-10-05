"""Registration rules: published only, not started, not full. Plus the privacy rule for the stored record."""

from datetime import timedelta

import pytest

from apps.activity.models import Activity, ActivityKind
from apps.events.exceptions import EventNotFound
from apps.events.models import EventStatus
from apps.registrations.exceptions import EventFull, EventNotPublished, RegistrationClosed
from apps.registrations.models import Registration
from apps.registrations.services import register_interest

pytestmark = pytest.mark.django_db


def test_registration_succeeds_for_a_published_event_with_space(make_event, visitor):
    event = make_event(capacity=2)
    registration = register_interest(event_id=event.pk, actor=visitor)
    assert registration.reference.startswith("REG-")
    assert registration.event == event
    assert event.registrations.count() == 1


def test_registration_records_an_activity_entry(make_event, visitor):
    event = make_event()
    registration = register_interest(event_id=event.pk, actor=visitor)
    entry = Activity.objects.get(kind=ActivityKind.REGISTRATION_CREATED)
    assert entry.event == event
    assert entry.registration_reference == registration.reference
    assert entry.actor == "visitor"


@pytest.mark.parametrize("status", [EventStatus.PENDING_REVIEW, EventStatus.REJECTED])
def test_registration_is_rejected_for_an_unpublished_event(make_event, visitor, status):
    event = make_event(status=status)
    with pytest.raises(EventNotPublished) as exc:
        register_interest(event_id=event.pk, actor=visitor)
    assert exc.value.status_code == 409
    assert not Registration.objects.exists()


def test_registration_is_rejected_once_the_event_is_full(make_event, fill, visitor):
    event = make_event(capacity=3)
    fill(event, 3)
    with pytest.raises(EventFull) as exc:
        register_interest(event_id=event.pk, actor=visitor)
    assert exc.value.code == "EVENT_FULL"
    assert event.registrations.count() == 3


def test_the_last_spot_can_be_taken_and_then_no_more(make_event, fill, visitor):
    event = make_event(capacity=3)
    fill(event, 2)
    register_interest(event_id=event.pk, actor=visitor)
    with pytest.raises(EventFull):
        register_interest(event_id=event.pk, actor=visitor)


def test_registration_is_closed_once_the_event_has_started(make_event, visitor, now):
    event = make_event(starts_at=now - timedelta(minutes=1))
    with pytest.raises(RegistrationClosed):
        register_interest(event_id=event.pk, actor=visitor)


def test_registration_for_an_unknown_event_is_not_found(visitor, db):
    with pytest.raises(EventNotFound):
        register_interest(event_id=424242, actor=visitor)


def test_rejected_registrations_leave_no_activity(make_event, visitor):
    event = make_event(status=EventStatus.PENDING_REVIEW)
    with pytest.raises(EventNotPublished):
        register_interest(event_id=event.pk, actor=visitor)
    assert not Activity.objects.filter(kind=ActivityKind.REGISTRATION_CREATED).exists()


def test_registration_table_holds_no_personal_data():
    """Privacy guard: the stored record is exactly a generated id, the event and a timestamp.

    If anyone adds a column (name, email, ip, user agent, notes...) this test fails.
    """
    columns = {field.name for field in Registration._meta.get_fields() if field.concrete}
    assert columns == {"reference", "event", "created_at"}


def test_registration_references_are_random_not_sequential(make_event, visitor):
    event = make_event(capacity=50)
    refs = [register_interest(event_id=event.pk, actor=visitor).reference for _ in range(20)]
    assert len(set(refs)) == 20
    assert refs != sorted(refs)
