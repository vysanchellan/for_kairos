"""Event endpoints.

Views stay thin: parse and validate the input -> call a service or selector ->
serialize the result. They hold no business rules; permission classes answer
"may this role call this endpoint?" before any work happens.
"""

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.permissions import IsAdministrator, IsEventOwner, IsOrganiser
from apps.core.serializers import ErrorResponseSerializer as Error, parse_query
from apps.events import selectors, services
from apps.events.serializers import (
    EventListQuerySerializer,
    EventSerializer,
    EventStatsSerializer,
    EventWriteSerializer,
    PublicStatsSerializer,
    RejectEventSerializer,
    StatusQuerySerializer,
)


class EventCollectionView(GenericAPIView):
    """``GET`` published events (anyone) and ``POST`` a new event (organisers)."""

    serializer_class = EventSerializer

    def get_permissions(self):
        return [IsOrganiser()] if self.request.method == "POST" else [AllowAny()]

    @extend_schema(
        summary="Browse published events",
        parameters=[EventListQuerySerializer],
        responses={200: EventSerializer(many=True), 400: Error},
    )
    def get(self, request):
        query = parse_query(EventListQuerySerializer, request)
        events = selectors.list_public_events(
            category=query.get("category"), upcoming=query["upcoming"], search=query.get("q")
        )
        page = self.paginate_queryset(events)
        return self.get_paginated_response(EventSerializer(page, many=True).data)

    @extend_schema(
        summary="Create an event (organiser). It starts as PENDING_REVIEW.",
        request=EventWriteSerializer,
        responses={201: EventSerializer, 400: Error, 403: Error},
    )
    def post(self, request):
        serializer = EventWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event = services.create_event(actor=request.user, **serializer.validated_data)
        event = selectors.get_event_for_actor(reference=event.reference, actor=request.user)
        return Response(
            EventSerializer(event).data,
            status=status.HTTP_201_CREATED,
            headers={"Location": f"/api/v1/events/{event.reference}/"},
        )


class PublicStatsView(GenericAPIView):
    """Headline numbers for the Discover page (published events only)."""

    permission_classes = [AllowAny]

    @extend_schema(summary="Public headline numbers", responses={200: PublicStatsSerializer})
    def get(self, request):
        return Response(selectors.public_stats())


class EventDetailView(GenericAPIView):
    """``GET`` one event (subject to visibility) and ``PATCH`` it (its organiser only)."""

    serializer_class = EventSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_permissions(self):
        if self.request.method == "PATCH":
            return [IsOrganiser(), IsEventOwner()]
        return [AllowAny()]

    def get_object(self):
        event = selectors.get_event_for_actor(reference=self.kwargs["reference"], actor=self.request.user)
        self.check_object_permissions(self.request, event)
        return event

    @extend_schema(summary="Get an event", responses={200: EventSerializer, 404: Error})
    def get(self, request, reference: str):
        return Response(EventSerializer(self.get_object()).data)

    @extend_schema(
        summary="Update your event (organiser)",
        request=EventWriteSerializer,
        responses={200: EventSerializer, 400: Error, 403: Error, 404: Error},
    )
    def patch(self, request, reference: str):
        event = self.get_object()
        serializer = EventWriteSerializer(instance=event, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        services.update_event(event_id=event.pk, actor=request.user, changes=serializer.validated_data)
        event = selectors.get_event_for_actor(reference=reference, actor=request.user)
        return Response(EventSerializer(event).data)


class OrganiserEventListView(GenericAPIView):
    """The acting organiser's own events, in every status."""

    serializer_class = EventSerializer
    permission_classes = [IsOrganiser]

    @extend_schema(
        summary="List my events (organiser)",
        parameters=[StatusQuerySerializer],
        responses={200: EventSerializer(many=True), 403: Error},
    )
    def get(self, request):
        query = parse_query(StatusQuerySerializer, request)
        events = selectors.list_organiser_events(
            organiser_id=request.user.organiser_id, status=query.get("status")
        )
        page = self.paginate_queryset(events)
        return self.get_paginated_response(EventSerializer(page, many=True).data)


class OrganiserStatsView(GenericAPIView):
    permission_classes = [IsOrganiser]

    @extend_schema(summary="Dashboard numbers for my events (organiser)", responses={200: EventStatsSerializer})
    def get(self, request):
        return Response(selectors.organiser_stats(organiser_id=request.user.organiser_id))


class AdminEventListView(GenericAPIView):
    """Every event, pending review first."""

    serializer_class = EventSerializer
    permission_classes = [IsAdministrator]

    @extend_schema(
        summary="List all events (admin)",
        parameters=[StatusQuerySerializer],
        responses={200: EventSerializer(many=True), 403: Error},
    )
    def get(self, request):
        query = parse_query(StatusQuerySerializer, request)
        page = self.paginate_queryset(selectors.list_admin_events(status=query.get("status")))
        return self.get_paginated_response(EventSerializer(page, many=True).data)


class AdminStatsView(GenericAPIView):
    permission_classes = [IsAdministrator]

    @extend_schema(summary="Review-queue numbers (admin)", responses={200: EventStatsSerializer})
    def get(self, request):
        return Response(selectors.admin_stats())


class AdminPublishEventView(GenericAPIView):
    permission_classes = [IsAdministrator]

    @extend_schema(
        summary="Publish a pending event (admin)",
        request=None,
        responses={200: EventSerializer, 403: Error, 404: Error, 409: Error},
    )
    def post(self, request, reference: str):
        services.publish_event(event_id=selectors.resolve_event_id(reference), actor=request.user)
        event = selectors.get_event_for_actor(reference=reference, actor=request.user)
        return Response(EventSerializer(event).data)


class AdminRejectEventView(GenericAPIView):
    permission_classes = [IsAdministrator]

    @extend_schema(
        summary="Request changes to a pending event (admin)",
        request=RejectEventSerializer,
        responses={200: EventSerializer, 400: Error, 403: Error, 404: Error, 409: Error},
    )
    def post(self, request, reference: str):
        serializer = RejectEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.reject_event(
            event_id=selectors.resolve_event_id(reference),
            actor=request.user,
            note=serializer.validated_data["note"],
        )
        event = selectors.get_event_for_actor(reference=reference, actor=request.user)
        return Response(EventSerializer(event).data)
