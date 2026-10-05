from django.db import models

from apps.core import clock


class ActivityKind(models.TextChoices):
    EVENT_CREATED = "EVENT_CREATED", "Event submitted"
    EVENT_UPDATED = "EVENT_UPDATED", "Event updated"
    EVENT_PUBLISHED = "EVENT_PUBLISHED", "Event published"
    EVENT_REJECTED = "EVENT_REJECTED", "Changes requested"
    REGISTRATION_CREATED = "REGISTRATION_CREATED", "Registration received"


class Activity(models.Model):
    """An append-only record of something that happened ("notification").

    ``actor`` is a role label (``admin``, ``organiser-1``, ``visitor``), never a
    person. ``registration_reference`` is a plain string rather than a foreign
    key, so the activity app doesn't depend on the registrations app.
    """

    kind = models.CharField(max_length=32, choices=ActivityKind.choices)
    event = models.ForeignKey("events.Event", on_delete=models.CASCADE, related_name="activity")
    registration_reference = models.CharField(max_length=16, blank=True)
    actor = models.CharField(max_length=40)
    message = models.CharField(max_length=200)
    created_at = models.DateTimeField(default=clock.now, editable=False)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name_plural = "activity"
        indexes = [models.Index(fields=["-created_at"], name="activity_created_idx")]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(kind__in=ActivityKind.values), name="activity_kind_valid"
            )
        ]

    def __str__(self) -> str:
        return self.message
