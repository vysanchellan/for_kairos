"""Business rules for creating, updating, publishing and rejecting events (service layer)."""

from datetime import timedelta

import pytest

from apps.activity.models import Activity, ActivityKind
from apps.core.exceptions import AdminOnly, OrganiserOnly, ValidationFailed
from apps.events import selectors, services
from apps.events.exceptions import (
    EventAlreadyStarted,
    EventNotFound,
    InvalidStatusTransition,
    NotEventOwner,
)
from apps.events.models import EventStatus

pytestmark = pytest.mark.django_db


def create(actor, now, **overrides):
    fields = {"title": "Seed Swap", "starts_at": now + timedelta(days=3), "capacity": 20}
    fields.update(overrides)
    return services.create_event(actor=actor, **fields)


class TestCreateEvent:
    def test_new_events_always_start_pending_review(self, organiser, now):
        event = create(organiser, now)
        assert event.status == EventStatus.PENDING_REVIEW
        assert event.organiser_id == "organiser-1"

    def test_only_organisers_can_create(self, visitor, admin, now):
        for actor in (visitor, admin):
            with pytest.raises(OrganiserOnly):
                create(actor, now)

    @pytest.mark.parametrize("delta", [timedelta(0), timedelta(minutes=-1), timedelta(days=-30)])
    def test_start_time_must_be_in_the_future(self, organiser, now, delta):
        with pytest.raises(ValidationFailed) as exc:
            create(organiser, now, starts_at=now + delta)
        assert "starts_at" in exc.value.fields

    def test_creation_is_recorded_in_activity(self, organiser, now):
        event = create(organiser, now)
        assert Activity.objects.filter(event=event, kind=ActivityKind.EVENT_CREATED).exists()


class TestUpdateEvent:
    def test_owner_can_update_fields(self, organiser, make_event):
        event = make_event()
        updated = services.update_event(event_id=event.pk, actor=organiser, changes={"title": "New"})
        assert updated.title == "New"

    def test_organiser_cannot_edit_another_organisers_event(self, other_organiser, make_event):
        event = make_event(organiser_id="organiser-1")
        with pytest.raises(NotEventOwner):
            services.update_event(event_id=event.pk, actor=other_organiser, changes={"title": "Mine now"})

    def test_status_cannot_be_changed_through_an_update(self, organiser, make_event):
        event = make_event(status=EventStatus.PENDING_REVIEW)
        with pytest.raises(ValidationFailed) as exc:
            services.update_event(
                event_id=event.pk, actor=organiser, changes={"status": EventStatus.PUBLISHED}
            )
        assert "status" in exc.value.fields
        event.refresh_from_db()
        assert event.status == EventStatus.PENDING_REVIEW

    def test_capacity_cannot_drop_below_existing_registrations(self, organiser, make_event, fill):
        event = make_event(capacity=10)
        fill(event, 6)
        with pytest.raises(ValidationFailed) as exc:
            services.update_event(event_id=event.pk, actor=organiser, changes={"capacity": 5})
        assert "6 people have already registered" in exc.value.fields["capacity"]

    def test_capacity_can_drop_to_exactly_the_registration_count(self, organiser, make_event, fill):
        event = make_event(capacity=10)
        fill(event, 6)
        updated = services.update_event(event_id=event.pk, actor=organiser, changes={"capacity": 6})
        assert updated.capacity == 6

    def test_new_date_must_be_in_the_future(self, organiser, make_event, now):
        event = make_event()
        with pytest.raises(ValidationFailed):
            services.update_event(
                event_id=event.pk, actor=organiser, changes={"starts_at": now - timedelta(hours=1)}
            )

    def test_editing_a_rejected_event_resubmits_it_for_review(self, organiser, make_event):
        event = make_event(status=EventStatus.REJECTED, review_note="Add a venue")
        updated = services.update_event(
            event_id=event.pk, actor=organiser, changes={"location": "Town Hall"}
        )
        assert updated.status == EventStatus.PENDING_REVIEW
        assert updated.review_note == ""

    def test_editing_a_published_event_keeps_it_published(self, organiser, make_event):
        event = make_event(status=EventStatus.PUBLISHED)
        updated = services.update_event(event_id=event.pk, actor=organiser, changes={"title": "Renamed"})
        assert updated.status == EventStatus.PUBLISHED


class TestPublishEvent:
    def test_publishing_makes_the_event_visible_to_visitors(self, admin, visitor, make_event):
        event = make_event(status=EventStatus.PENDING_REVIEW)
        assert event not in selectors.list_public_events()

        services.publish_event(event_id=event.pk, actor=admin)

        assert event in selectors.list_public_events()
        assert selectors.get_event_for_actor(reference=event.reference, actor=visitor) == event

    def test_publishing_records_an_activity_entry(self, admin, make_event):
        event = make_event(status=EventStatus.PENDING_REVIEW)
        services.publish_event(event_id=event.pk, actor=admin)
        entry = Activity.objects.get(event=event, kind=ActivityKind.EVENT_PUBLISHED)
        assert entry.message == f"Event {event.reference} was published."
        assert entry.actor == "admin"

    def test_only_administrators_can_publish(self, organiser, visitor, make_event):
        event = make_event(status=EventStatus.PENDING_REVIEW)
        for actor in (organiser, visitor):
            with pytest.raises(AdminOnly):
                services.publish_event(event_id=event.pk, actor=actor)
        event.refresh_from_db()
        assert event.status == EventStatus.PENDING_REVIEW

    def test_publishing_twice_is_a_conflict(self, admin, make_event):
        event = make_event(status=EventStatus.PENDING_REVIEW)
        services.publish_event(event_id=event.pk, actor=admin)
        with pytest.raises(InvalidStatusTransition):
            services.publish_event(event_id=event.pk, actor=admin)
        assert Activity.objects.filter(event=event, kind=ActivityKind.EVENT_PUBLISHED).count() == 1

    def test_an_event_that_has_started_cannot_be_published(self, admin, make_event, now):
        event = make_event(status=EventStatus.PENDING_REVIEW, starts_at=now - timedelta(minutes=5))
        with pytest.raises(EventAlreadyStarted):
            services.publish_event(event_id=event.pk, actor=admin)

    def test_publishing_an_unknown_event_is_not_found(self, admin, db):
        with pytest.raises(EventNotFound):
            services.publish_event(event_id=999_999, actor=admin)


class TestRejectEvent:
    def test_reject_stores_the_note_and_hides_the_event(self, admin, make_event):
        event = make_event(status=EventStatus.PENDING_REVIEW)
        services.reject_event(event_id=event.pk, actor=admin, note="Please add a venue.")
        event.refresh_from_db()
        assert event.status == EventStatus.REJECTED
        assert event.review_note == "Please add a venue."
        assert event not in selectors.list_public_events()

    def test_a_published_event_cannot_be_rejected(self, admin, make_event):
        event = make_event(status=EventStatus.PUBLISHED)
        with pytest.raises(InvalidStatusTransition):
            services.reject_event(event_id=event.pk, actor=admin)
