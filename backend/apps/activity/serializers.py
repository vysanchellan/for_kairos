from rest_framework import serializers

from apps.activity.models import Activity, ActivityKind


class ActivityEventSerializer(serializers.Serializer):
    id = serializers.CharField(source="reference")
    title = serializers.CharField()
    status = serializers.CharField()


class ActivitySerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display")
    event = ActivityEventSerializer()
    registration_id = serializers.CharField(source="registration_reference")

    class Meta:
        model = Activity
        fields = ["id", "kind", "kind_label", "message", "actor", "event", "registration_id", "created_at"]
        read_only_fields = fields


class ActivityQuerySerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=ActivityKind.choices, required=False)
