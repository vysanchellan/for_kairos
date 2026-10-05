"""Base class for business-rule failures.

Domain errors are raised by services and selectors. They know nothing about
HTTP requests, but each carries a stable machine-readable ``code``, a
human-readable ``message`` and the HTTP status it should map to. The API's
exception handler turns them into the standard error body.
"""


class DomainError(Exception):
    code: str = "DOMAIN_ERROR"
    message: str = "The request could not be completed."
    status_code: int = 400

    def __init__(self, message: str | None = None, *, fields: dict[str, str] | None = None):
        self.message = message or self.message
        self.fields = fields
        super().__init__(self.message)


class ValidationFailed(DomainError):
    """A business rule about input failed; ``fields`` says which inputs."""

    code = "VALIDATION_ERROR"
    message = "Some details need fixing before we can continue."
    status_code = 400


class AdminOnly(DomainError):
    code = "ADMIN_ONLY"
    message = "Only administrators can do this."
    status_code = 403


class OrganiserOnly(DomainError):
    code = "ORGANISER_ONLY"
    message = "Switch to an organiser to manage events."
    status_code = 403


class ServiceUnavailable(DomainError):
    code = "SERVICE_UNAVAILABLE"
    message = "The service is temporarily unavailable. Please try again shortly."
    status_code = 503
