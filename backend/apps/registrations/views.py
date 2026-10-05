from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.serializers import ErrorResponseSerializer as Error
from apps.events import selectors
from apps.registrations.serializers import RegistrationResultSerializer
from apps.registrations.services import register_interest


class EventRegistrationsView(GenericAPIView):
    """``POST /events/{id}/registrations/``: register anonymous interest.

    There is no request body: anonymity is the point. Registering is open to
    any caller, because the role headers say nothing about who is registering.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Register anonymous interest in an event",
        request=None,
        responses={201: RegistrationResultSerializer, 404: Error, 409: Error},
    )
    def post(self, request, reference: str):
        event_id = selectors.resolve_event_id(reference)
        registration = register_interest(event_id=event_id, actor=request.user)
        event = selectors.get_event_for_actor(reference=reference, actor=request.user)
        result = {
            "id": registration.reference,
            "event_id": event.reference,
            "created_at": registration.created_at,
            "registered_count": event.registered_count,
            "spots_remaining": max(event.capacity - event.registered_count, 0),
        }
        return Response(RegistrationResultSerializer(result).data, status=status.HTTP_201_CREATED)
