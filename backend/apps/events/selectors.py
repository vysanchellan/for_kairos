"""Read-side queries for events.

Every selector returns events annotated with ``registered_count``. The count is
always derived from the registrations table and never stored.

Visibility rules live here, not in views:
  * visitors see published events only
  * organisers also see their own events in any status
  * administrators see everything
"""

from django.db.models import Case, Count, IntegerField, Q, QuerySet, Sum, Value, When

from apps.core import clock
from apps.core.auth import Principal
from apps.events.exceptions import EventNotFound
from apps.events.models import Event, EventStatus


def _with_counts(qs: QuerySet[Event]) -> QuerySet[Event]:
    return qs.annotate(registered_count=Count("registrations"))


def visible_to(actor: Principal) -> Q:
    if actor.is_admin:
        return Q()
    published = Q(status=EventStatus.PUBLISHED)
    if actor.is_organiser:
        return published | Q(organiser_id=actor.organiser_id)
    return published


def list_public_events(
    *, category: str | None = None, upcoming: bool = True, search: str | None = None
) -> QuerySet[Event]:
    qs = Event.objects.filter(status=EventStatus.PUBLISHED)
    if upcoming:
        qs = qs.filter(starts_at__gt=clock.now())
    if category:
        qs = qs.filter(category=category)
    if search:
        qs = qs.filter(title__icontains=search)
    return _with_counts(qs).order_by("starts_at", "id")


def list_organiser_events(*, organiser_id: str, status: str | None = None) -> QuerySet[Event]:
    qs = Event.objects.filter(organiser_id=organiser_id)
    if status:
        qs = qs.filter(status=status)
    return _with_counts(qs).order_by("starts_at", "id")


def list_admin_events(*, status: str | None = None) -> QuerySet[Event]:
    """All events. Pending review comes first, because that's the admin's to-do list."""
    qs = Event.objects.all()
    if status:
        qs = qs.filter(status=status)
    review_first = Case(
        When(status=EventStatus.PENDING_REVIEW, then=Value(0)),
        default=Value(1),
        output_field=IntegerField(),
    )
    return _with_counts(qs).annotate(review_order=review_first).order_by(
        "review_order", "starts_at", "id"
    )


def get_event_for_actor(*, reference: str, actor: Principal) -> Event:
    """Fetch one event, or raise EventNotFound if it doesn't exist *or* the actor can't see it.

    Answering 404 (not 403) for hidden events means a visitor can't tell an
    unpublished event apart from one that doesn't exist.
    """
    pk = Event.reference_to_pk(reference)
    if pk is None:
        raise EventNotFound()
    event = _with_counts(Event.objects.filter(visible_to(actor), pk=pk)).first()
    if event is None:
        raise EventNotFound()
    return event


def organiser_stats(*, organiser_id: str) -> dict[str, int]:
    events = Event.objects.filter(organiser_id=organiser_id)
    by_status = events.aggregate(
        total=Count("id"),
        pending=Count("id", filter=Q(status=EventStatus.PENDING_REVIEW)),
        published=Count("id", filter=Q(status=EventStatus.PUBLISHED)),
        changes_requested=Count("id", filter=Q(status=EventStatus.REJECTED)),
    )
    # A separate query: summing over a join with the aggregate above would
    # multiply the status counts by the registration rows.
    registrations = _with_counts(events).aggregate(total=Sum("registered_count"))["total"] or 0
    return {**by_status, "registrations": registrations}


def admin_stats() -> dict[str, int]:
    return Event.objects.aggregate(
        total=Count("id"),
        pending=Count("id", filter=Q(status=EventStatus.PENDING_REVIEW)),
        published=Count("id", filter=Q(status=EventStatus.PUBLISHED)),
        changes_requested=Count("id", filter=Q(status=EventStatus.REJECTED)),
    )
