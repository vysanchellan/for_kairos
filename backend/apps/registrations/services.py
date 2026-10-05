"""Anonymous registration of interest.

Why the lock matters: "count the registrations, then insert one if there is
room" is a check-then-act sequence. Without a lock, two requests for the last
spot can both see "1 left" and both insert, which overbooks the event. Running
the check and the insert in one transaction while holding the event row lock
(``select_for_update``, or SQLite's BEGIN IMMEDIATE write lock) means the
second request waits, then sees "0 left" and is refused.
"""

import logging

from django.db import transaction

from apps.activity.models import ActivityKind
from apps.activity.services import record_activity
from apps.core import clock
from apps.core.auth import Principal
from apps.core.logging import kv
from apps.events.exceptions import EventNotFound
from apps.events.models import Event, EventStatus, format_reference
from apps.registrations.exceptions import EventFull, EventNotPublished, RegistrationClosed
from apps.registrations.models import Registration

logger = logging.getLogger(__name__)


def register_interest(*, event_id: int, actor: Principal) -> Registration:
    """Store an anonymous registration for a published, upcoming event with spots left.

    ``actor`` is used only for the role label in the activity feed. Nothing
    about the person is stored or logged.
    """
    reference = format_reference(event_id)
    logger.info("registration requested %s", kv(op="register_interest", event=reference))
    try:
        with transaction.atomic():
            event = Event.objects.select_for_update().filter(pk=event_id).first()
            if event is None:
                raise EventNotFound()
            if event.status != EventStatus.PUBLISHED:
                raise EventNotPublished()
            if event.starts_at <= clock.now():
                raise RegistrationClosed()
            registered = event.registrations.count()
            if registered >= event.capacity:
                raise EventFull()
            logger.info(
                "event validated %s",
                kv(
                    op="register_interest",
                    event=reference,
                    status=event.status,
                    spots_before=event.capacity - registered,
                ),
            )

            registration = Registration.objects.create(event=event)
            logger.info(
                "registration stored %s",
                kv(op="register_interest", event=reference, registration=registration.reference),
            )
            record_activity(
                kind=ActivityKind.REGISTRATION_CREATED,
                event=event,
                actor=actor.role.value,
                message=f"A new registration was received for {reference}.",
                registration_reference=registration.reference,
            )
    except (EventNotFound, EventNotPublished, RegistrationClosed, EventFull) as exc:
        logger.warning(
            "registration rejected %s",
            kv(op="register_interest", event=reference, outcome="rejected", code=exc.code),
        )
        raise

    logger.info(
        "registration completed %s",
        kv(
            op="register_interest",
            event=reference,
            registration=registration.reference,
            outcome="success",
        ),
    )
    return registration
