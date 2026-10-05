from apps.core.exceptions import DomainError


class EventNotPublished(DomainError):
    code = "EVENT_NOT_PUBLISHED"
    message = "Registration opens once this event has been published."
    status_code = 409


class RegistrationClosed(DomainError):
    code = "REGISTRATION_CLOSED"
    message = "Registration has closed because this event has already started."
    status_code = 409


class EventFull(DomainError):
    code = "EVENT_FULL"
    message = "Registration is no longer available because this event is full."
    status_code = 409
