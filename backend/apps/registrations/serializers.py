from rest_framework import serializers


class RegistrationResultSerializer(serializers.Serializer):
    """The receipt a visitor sees after registering, plus fresh capacity numbers for the UI."""

    id = serializers.CharField(help_text="Registration reference, e.g. REG-7KQ2M9XH4P")
    event_id = serializers.CharField(help_text="Event reference, e.g. EVT-1002")
    created_at = serializers.DateTimeField()
    registered_count = serializers.IntegerField()
    spots_remaining = serializers.IntegerField()
