"""Access rules as DRF permission classes.

``message`` and ``code`` are read by DRF when it raises PermissionDenied, and
the exception handler passes them straight into the error body.
"""

from rest_framework.permissions import BasePermission


class IsAdministrator(BasePermission):
    message = "Only administrators can do this."
    code = "ADMIN_ONLY"

    def has_permission(self, request, view) -> bool:
        return request.user.is_admin


class IsOrganiser(BasePermission):
    message = "Switch to an organiser to manage events."
    code = "ORGANISER_ONLY"

    def has_permission(self, request, view) -> bool:
        return request.user.is_organiser


class IsEventOwner(BasePermission):
    """Object-level rule: the organiser must own the event they are changing."""

    message = "You can only change events that you organise."
    code = "NOT_EVENT_OWNER"

    def has_permission(self, request, view) -> bool:
        return request.user.is_organiser

    def has_object_permission(self, request, view, obj) -> bool:
        return obj.organiser_id == request.user.organiser_id
