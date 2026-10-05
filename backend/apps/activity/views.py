from drf_spectacular.utils import extend_schema
from rest_framework.generics import GenericAPIView

from apps.activity.selectors import list_activity
from apps.activity.serializers import ActivityQuerySerializer, ActivitySerializer
from apps.core.permissions import IsAdministrator
from apps.core.serializers import ErrorResponseSerializer as Error, parse_query


class ActivityFeedView(GenericAPIView):
    """Newest-first feed of publishes, registrations and other changes."""

    serializer_class = ActivitySerializer
    permission_classes = [IsAdministrator]

    @extend_schema(
        summary="Activity feed (admin)",
        parameters=[ActivityQuerySerializer],
        responses={200: ActivitySerializer(many=True), 403: Error},
    )
    def get(self, request):
        query = parse_query(ActivityQuerySerializer, request)
        page = self.paginate_queryset(list_activity(kind=query.get("kind")))
        return self.get_paginated_response(ActivitySerializer(page, many=True).data)
