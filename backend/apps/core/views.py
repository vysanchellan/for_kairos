import logging

from django.db import DatabaseError, connection
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.demo import DEMO_ORGANISERS
from apps.core.exceptions import ServiceUnavailable

logger = logging.getLogger(__name__)


class HealthView(APIView):
    """Liveness plus a database round-trip, so "up" also means "can serve data"."""

    @extend_schema(
        responses=inline_serializer(
            "Health", {"status": serializers.CharField(), "database": serializers.CharField()}
        )
    )
    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except DatabaseError:
            logger.exception("health check failed: database unreachable")
            raise ServiceUnavailable() from None
        return Response({"status": "ok", "database": "ok"})


class OrganiserDirectoryView(APIView):
    """The seeded demo organisers, for the frontend's role switcher."""

    @extend_schema(
        responses=inline_serializer(
            "DemoOrganiser",
            {"id": serializers.CharField(), "name": serializers.CharField()},
            many=True,
        )
    )
    def get(self, request):
        return Response([{"id": key, "name": name} for key, name in DEMO_ORGANISERS.items()])
