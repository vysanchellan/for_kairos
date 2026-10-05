"""Reusable serializer building blocks."""

from collections.abc import Mapping

from rest_framework import serializers


class StrictInputSerializer(serializers.Serializer):
    """Rejects fields the endpoint doesn't accept, instead of silently ignoring them.

    A client that sends ``{"status": "PUBLISHED"}`` to the update endpoint gets a
    clear 400 ("This field can't be set"), rather than a 200 that leaves the
    status unchanged, which would look like it worked.
    """

    def to_internal_value(self, data):
        unknown = {}
        if isinstance(data, Mapping):
            unknown = {
                name: ["This field can't be set."]
                for name in data
                if name not in self.fields or self.fields[name].read_only
            }
        try:
            value = super().to_internal_value(data)
        except serializers.ValidationError as exc:
            if unknown and isinstance(exc.detail, dict):
                raise serializers.ValidationError({**exc.detail, **unknown}) from None
            raise
        if unknown:
            raise serializers.ValidationError(unknown)
        return value


class WholeNumberField(serializers.IntegerField):
    """An integer that must arrive as a JSON integer.

    DRF's IntegerField happily coerces ``"5"``, ``5.0`` and ``true`` (bool is an
    int in Python). For a capacity, we want "a whole number" to mean exactly that.
    """

    default_error_messages = {
        "invalid": "Enter a whole number.",
        "min_value": "Must be at least {min_value}.",
        "max_value": "Must be {max_value} or fewer.",
    }

    def to_internal_value(self, data):
        if isinstance(data, bool) or not isinstance(data, int):
            self.fail("invalid")
        return super().to_internal_value(data)


def parse_query(serializer_class: type[serializers.Serializer], request) -> dict:
    """Validate query parameters with a serializer (invalid -> 400 VALIDATION_ERROR).

    ``.dict()`` matters: on a QueryDict, DRF treats a missing boolean as False
    (HTML-checkbox semantics), so a default like ``upcoming=True`` would be ignored.
    """
    serializer = serializer_class(data=request.query_params.dict())
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


class ErrorResponseSerializer(serializers.Serializer):
    """The single error shape every endpoint returns. Used for the OpenAPI docs."""

    code = serializers.CharField(help_text="Stable, machine-readable, e.g. EVENT_FULL")
    message = serializers.CharField(help_text="Human-readable, safe to show to users")
    fields = serializers.DictField(
        child=serializers.CharField(), required=False, help_text="Per-field messages (400 only)"
    )
    request_id = serializers.CharField(help_text="Matches the X-Request-ID header and server logs")
