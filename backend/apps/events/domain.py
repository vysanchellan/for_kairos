"""Pure event rules: the status lifecycle and the field rules.

Nothing here touches the database or HTTP, which makes these functions trivial
to test and lets both the serializers (for friendly, all-at-once field errors)
and the services (as the final guard) share one definition of each rule.
"""

from datetime import datetime

from apps.events.exceptions import InvalidStatusTransition
from apps.events.models import EventStatus

#: The whole lifecycle in one place. Anything not listed is forbidden.
#:
#:   PENDING_REVIEW --publish--> PUBLISHED
#:   PENDING_REVIEW --reject---> REJECTED --organiser edits--> PENDING_REVIEW
ALLOWED_TRANSITIONS: dict[str, frozenset[str]] = {
    EventStatus.PENDING_REVIEW: frozenset({EventStatus.PUBLISHED, EventStatus.REJECTED}),
    EventStatus.REJECTED: frozenset({EventStatus.PENDING_REVIEW}),
    EventStatus.PUBLISHED: frozenset(),
}

_TRANSITION_MESSAGES = {
    (EventStatus.PUBLISHED, EventStatus.PUBLISHED): "This event is already published.",
    (EventStatus.PUBLISHED, EventStatus.REJECTED): "This event is already published.",
    (EventStatus.REJECTED, EventStatus.PUBLISHED): (
        "Changes were requested for this event. The organiser needs to update it first."
    ),
    (EventStatus.REJECTED, EventStatus.REJECTED): "Changes have already been requested.",
}


def can_transition(current: str, target: str) -> bool:
    return target in ALLOWED_TRANSITIONS.get(current, frozenset())


def ensure_transition(current: str, target: str) -> None:
    if not can_transition(current, target):
        raise InvalidStatusTransition(_TRANSITION_MESSAGES.get((current, target)))


PAST_DATE_MESSAGE = "Pick a date and time in the future."


def starts_at_error(starts_at: datetime, now: datetime) -> str | None:
    return PAST_DATE_MESSAGE if starts_at <= now else None


def capacity_error(capacity: int, registered: int) -> str | None:
    if capacity < registered:
        noun = "person has" if registered == 1 else "people have"
        return f"{registered} {noun} already registered, so capacity can't go below {registered}."
    return None
