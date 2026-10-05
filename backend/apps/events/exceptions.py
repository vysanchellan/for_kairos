from apps.core.exceptions import DomainError


class EventNotFound(DomainError):
    code = "EVENT_NOT_FOUND"
    message = "We couldn't find that event. It may not be published yet."
    status_code = 404


class NotEventOwner(DomainError):
    code = "NOT_EVENT_OWNER"
    message = "You can only change events that you organise."
    status_code = 403


class InvalidStatusTransition(DomainError):
    code = "INVALID_STATUS_TRANSITION"
    message = "This event can't move to that status."
    status_code = 409


class EventAlreadyStarted(DomainError):
    code = "EVENT_ALREADY_STARTED"
    message = "This event has already started, so it can't be published."
    status_code = 409
