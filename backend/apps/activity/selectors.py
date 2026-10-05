from django.db.models import QuerySet

from apps.activity.models import Activity


def list_activity(*, kind: str | None = None) -> QuerySet[Activity]:
    """Newest first. The event is joined in so the feed can show its title."""
    qs = Activity.objects.select_related("event")
    if kind:
        qs = qs.filter(kind=kind)
    return qs
