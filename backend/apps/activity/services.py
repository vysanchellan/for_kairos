import logging

from apps.activity.models import Activity, ActivityKind
from apps.core.logging import kv

logger = logging.getLogger(__name__)


def record_activity(
    *,
    kind: ActivityKind,
    event,
    actor: str,
    message: str,
    registration_reference: str = "",
) -> Activity:
    """Append an activity entry.

    Callers run this inside their own transaction, so the entry is stored if
    and only if the change it describes is stored.
    """
    entry = Activity.objects.create(
        kind=kind,
        event=event,
        actor=actor,
        message=message,
        registration_reference=registration_reference,
    )
    logger.info(
        "activity recorded %s",
        kv(
            kind=kind.value,
            event=event.reference,
            registration=registration_reference or None,
            activity_id=entry.pk,
        ),
    )
    return entry
