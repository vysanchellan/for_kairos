"""Event input/output shapes.

Serializers describe and validate the *shape* of data (types, lengths, required
fields). The business rules themselves live in ``domain.py`` and ``services.py``.
"""

from rest_framework import serializers

from apps.core import clock
from apps.core.demo import DEMO_ORGANISERS
from apps.core.serializers import StrictInputSerializer, WholeNumberField
from apps.events import domain
from apps.events.models import MAX_CAPACITY, CoverImage, Event, EventCategory, EventStatus


class OrganiserSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()


class EventSerializer(serializers.ModelSerializer):
    """What clients see. ``registered_count`` comes from the selector's annotation."""

    id = serializers.CharField(source="reference", read_only=True)
    category_label = serializers.CharField(source="get_category_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    registered_count = serializers.IntegerField(read_only=True)
    spots_remaining = serializers.SerializerMethodField()
    is_full = serializers.SerializerMethodField()
    organiser = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id",
            "title",
            "description",
            "category",
            "category_label",
            "location",
            "cover_image",
            "starts_at",
            "capacity",
            "registered_count",
            "spots_remaining",
            "is_full",
            "status",
            "status_label",
            "review_note",
            "organiser",
            "published_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_spots_remaining(self, event: Event) -> int:
        return max(event.capacity - event.registered_count, 0)

    def get_is_full(self, event: Event) -> bool:
        return event.registered_count >= event.capacity

    def get_organiser(self, event: Event) -> dict:
        return OrganiserSerializer(
            {"id": event.organiser_id, "name": DEMO_ORGANISERS.get(event.organiser_id, event.organiser_id)}
        ).data


class EventWriteSerializer(StrictInputSerializer):
    """Create (all required fields) and update (``partial=True``) input."""

    title = serializers.CharField(
        max_length=Event.TITLE_MAX_LENGTH,
        error_messages={
            "required": "Give your event a title.",
            "blank": "Give your event a title.",
            "null": "Give your event a title.",
            "max_length": f"Keep the title to {Event.TITLE_MAX_LENGTH} characters or fewer.",
        },
    )
    description = serializers.CharField(
        max_length=Event.DESCRIPTION_MAX_LENGTH,
        allow_blank=True,
        required=False,
        error_messages={
            "max_length": f"Keep the description to {Event.DESCRIPTION_MAX_LENGTH} characters or fewer."
        },
    )
    category = serializers.ChoiceField(
        choices=EventCategory.choices,
        required=False,
        error_messages={"invalid_choice": "Pick one of the listed categories."},
    )
    location = serializers.CharField(
        max_length=Event.LOCATION_MAX_LENGTH, allow_blank=True, required=False
    )
    cover_image = serializers.ChoiceField(
        choices=CoverImage.choices,
        allow_blank=True,
        required=False,
        error_messages={"invalid_choice": "Pick one of the cover photos."},
    )
    starts_at = serializers.DateTimeField(
        error_messages={
            "required": "Choose when the event starts.",
            "null": "Choose when the event starts.",
            "invalid": "Enter a valid date and time.",
        },
    )
    capacity = WholeNumberField(
        min_value=1,
        max_value=MAX_CAPACITY,
        error_messages={
            "required": "Set how many people can attend.",
            "null": "Set how many people can attend.",
            "invalid": "Capacity must be a whole number, like 20.",
            "min_value": "Capacity must be at least 1.",
        },
    )

    def validate_starts_at(self, value):
        # Report a past date alongside any other field errors. The service
        # re-checks this, so it is enforced even for callers that skip the serializer.
        unchanged = self.instance is not None and value == self.instance.starts_at
        if not unchanged and (error := domain.starts_at_error(value, clock.now())):
            raise serializers.ValidationError(error)
        return value


class EventListQuerySerializer(serializers.Serializer):
    category = serializers.ChoiceField(choices=EventCategory.choices, required=False)
    upcoming = serializers.BooleanField(required=False, default=True)
    q = serializers.CharField(max_length=100, required=False, allow_blank=True)


class StatusQuerySerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=EventStatus.choices, required=False)


class RejectEventSerializer(StrictInputSerializer):
    note = serializers.CharField(max_length=280, allow_blank=True, required=False, default="")


class PublicStatsSerializer(serializers.Serializer):
    upcoming_events = serializers.IntegerField()
    registrations = serializers.IntegerField()
    organisers = serializers.IntegerField()


class EventStatsSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    pending = serializers.IntegerField()
    published = serializers.IntegerField()
    changes_requested = serializers.IntegerField()
    registrations = serializers.IntegerField(required=False)
