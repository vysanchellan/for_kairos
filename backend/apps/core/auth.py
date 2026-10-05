"""Demo-role "authentication".

The brief asks for demonstration roles, not real auth. We still model the role
as a DRF authentication class so that the rest of the code reads exactly like
it would with real auth: views see ``request.user`` as a ``Principal``, and
access rules are DRF permission classes.

Caveat (documented in the README): headers are trivially spoofable, so this
identifies the *demo role*, it does not prove who the caller is.
"""

from dataclasses import dataclass
from enum import StrEnum

from rest_framework import authentication, exceptions

from apps.core.demo import DEMO_ORGANISERS

ROLE_HEADER = "X-Demo-Role"
ORGANISER_HEADER = "X-Demo-Organiser-Id"


class Role(StrEnum):
    VISITOR = "visitor"
    ORGANISER = "organiser"
    ADMIN = "admin"


@dataclass(frozen=True)
class Principal:
    role: Role
    organiser_id: str | None = None

    # DRF's IsAuthenticated and friends read this attribute.
    is_authenticated = True

    @property
    def is_admin(self) -> bool:
        return self.role is Role.ADMIN

    @property
    def is_organiser(self) -> bool:
        return self.role is Role.ORGANISER

    @property
    def label(self) -> str:
        """A non-personal label for logs and the activity feed."""
        return self.organiser_id if self.is_organiser else self.role.value


VISITOR = Principal(role=Role.VISITOR)


class DemoRoleAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        raw_role = request.headers.get(ROLE_HEADER, "").strip().lower()
        if not raw_role:
            return (VISITOR, None)

        try:
            role = Role(raw_role)
        except ValueError:
            raise exceptions.AuthenticationFailed(
                "Unknown demo role. Use visitor, organiser or admin.", code="INVALID_DEMO_ROLE"
            ) from None

        if role is not Role.ORGANISER:
            return (Principal(role=role), None)

        organiser_id = request.headers.get(ORGANISER_HEADER, "").strip()
        if organiser_id not in DEMO_ORGANISERS:
            raise exceptions.AuthenticationFailed(
                "Pick one of the demo organisers to continue.", code="UNKNOWN_ORGANISER"
            )
        return (Principal(role=role, organiser_id=organiser_id), None)

    def authenticate_header(self, request) -> str:
        # Returning a value keeps failures as 401 (DRF turns them into 403 otherwise).
        return "DemoRole"
