"""Write-side operations for events. All business rules for changing an event live here.

Each service:
  * takes keyword-only arguments and the acting ``Principal``
  * re-checks who may do it (views check too, but services don't trust callers)
  * runs in one transaction, so the change and its activity entry commit together
  * logs at its boundaries, recording ids and outcomes only, never submitted text
"""

import logging
from datetime import datetime

from django.db import transaction

from apps.activity.models import ActivityKind
from apps.activity.services import record_activity
from apps.core import clock
from apps.core.auth import Principal
from apps.core.exceptions import AdminOnly, OrganiserOnly, ValidationFailed
from apps.core.logging import kv
from apps.events import domain
from apps.events.exceptions import EventAlreadyStarted, EventNotFound, NotEventOwner
from apps.events.models import Event, EventCategory, EventStatus

logger = logging.getLogger(__name__)

#: Fields an organiser may change. Status is deliberately absent; it only moves via the state machine.
EDITABLE_FIELDS = frozenset({"title", "description", "category", "location", "starts_at", "capacity"})


def _lock_event(event_id: int) -> Event:
    """Load an event and lock its row for the rest of the transaction.

    On SQLite the lock is really the database-wide write lock taken by
    BEGIN IMMEDIATE; on PostgreSQL this becomes ``SELECT ... FOR UPDATE``.
    """
    event = Event.objects.select_for_update().filter(pk=event_id).first()
    if event is None:
        raise EventNotFound()
    return event


def _ensure_future(starts_at: datetime) -> None:
    if error := domain.starts_at_error(starts_at, clock.now()):
        raise ValidationFailed(fields={"starts_at": error})


@transaction.atomic
def create_event(
    *,
    actor: Principal,
    title: str,
    starts_at: datetime,
    capacity: int,
    description: str = "",
    category: str = EventCategory.COMMUNITY,
    location: str = "",
) -> Event:
    """Create an event owned by the acting organiser. New events always await review."""
    if not actor.is_organiser:
        raise OrganiserOnly()
    _ensure_future(starts_at)

    event = Event.objects.create(
        title=title,
        description=description,
        category=category,
        location=location,
        starts_at=starts_at,
        capacity=capacity,
        organiser_id=actor.organiser_id,
        status=EventStatus.PENDING_REVIEW,
    )
    logger.info(
        "event created %s",
        kv(op="create_event", event=event.reference, organiser=actor.organiser_id, status=event.status),
    )
    record_activity(
        kind=ActivityKind.EVENT_CREATED,
        event=event,
        actor=actor.label,
        message=f"{event.reference} was submitted for review.",
    )
    return event


@transaction.atomic
def update_event(*, event_id: int, actor: Principal, changes: dict) -> Event:
    """Apply an organiser's edits to their own event.

    * Capacity can't drop below the number of people already registered.
    * A new date must be in the future (an unchanged date is left alone).
    * Editing an event that had changes requested resubmits it for review.
    """
    if not actor.is_organiser:
        raise OrganiserOnly()
    unknown = set(changes) - EDITABLE_FIELDS
    if unknown:
        raise ValidationFailed(fields={name: "This field can't be changed." for name in sorted(unknown)})

    event = _lock_event(event_id)
    if event.organiser_id != actor.organiser_id:
        raise NotEventOwner()

    if "starts_at" in changes and changes["starts_at"] != event.starts_at:
        _ensure_future(changes["starts_at"])
    if "capacity" in changes:
        registered = event.registrations.count()
        if error := domain.capacity_error(changes["capacity"], registered):
            raise ValidationFailed(fields={"capacity": error})

    for name, value in changes.items():
        setattr(event, name, value)

    resubmitted = event.status == EventStatus.REJECTED
    if resubmitted:
        domain.ensure_transition(event.status, EventStatus.PENDING_REVIEW)
        event.status = EventStatus.PENDING_REVIEW
        event.review_note = ""

    event.save()
    logger.info(
        "event updated %s",
        kv(
            op="update_event",
            event=event.reference,
            fields=",".join(sorted(changes)) or "none",
            resubmitted=resubmitted,
        ),
    )
    record_activity(
        kind=ActivityKind.EVENT_UPDATED,
        event=event,
        actor=actor.label,
        message=(
            f"{event.reference} was updated and resubmitted for review."
            if resubmitted
            else f"{event.reference} was updated."
        ),
    )
    return event


@transaction.atomic
def publish_event(*, event_id: int, actor: Principal) -> Event:
    """PENDING_REVIEW -> PUBLISHED. The event becomes visible to visitors."""
    if not actor.is_admin:
        raise AdminOnly()
    event = _lock_event(event_id)
    logger.info("publish requested %s", kv(op="publish_event", event=event.reference, status=event.status))

    domain.ensure_transition(event.status, EventStatus.PUBLISHED)
    if event.starts_at <= clock.now():
        raise EventAlreadyStarted()

    event.status = EventStatus.PUBLISHED
    event.published_at = clock.now()
    event.review_note = ""
    event.save(update_fields=["status", "published_at", "review_note", "updated_at"])
    logger.info("event published %s", kv(op="publish_event", event=event.reference, outcome="success"))
    record_activity(
        kind=ActivityKind.EVENT_PUBLISHED,
        event=event,
        actor=actor.label,
        message=f"Event {event.reference} was published.",
    )
    return event


@transaction.atomic
def reject_event(*, event_id: int, actor: Principal, note: str = "") -> Event:
    """PENDING_REVIEW -> REJECTED ("changes requested"), with an optional note for the organiser."""
    if not actor.is_admin:
        raise AdminOnly()
    event = _lock_event(event_id)
    domain.ensure_transition(event.status, EventStatus.REJECTED)

    event.status = EventStatus.REJECTED
    event.review_note = note
    event.save(update_fields=["status", "review_note", "updated_at"])
    logger.info("event rejected %s", kv(op="reject_event", event=event.reference, outcome="success"))
    record_activity(
        kind=ActivityKind.EVENT_REJECTED,
        event=event,
        actor=actor.label,
        message=f"Changes were requested for {event.reference}.",
    )
    return event
