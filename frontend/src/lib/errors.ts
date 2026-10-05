/**
 * API error codes -> what we tell people. The backend message is already
 * friendly, but owning the copy here keeps the voice consistent and lets us
 * add a title and a next step.
 */

import { ApiError } from "./api/client";

export interface FriendlyError {
  title: string;
  message: string;
  retryable: boolean;
}

const COPY: Record<string, Omit<FriendlyError, "retryable">> = {
  NETWORK_ERROR: {
    title: "You're offline",
    message: "We can't reach the server. Check your connection and try again.",
  },
  SERVICE_UNAVAILABLE: {
    title: "We're having trouble connecting",
    message: "The events service isn't responding right now. Try again in a moment.",
  },
  INTERNAL_ERROR: {
    title: "Something went wrong",
    message: "That's on us, not you. Try again, and if it keeps happening, share the reference below.",
  },
  EVENT_NOT_FOUND: {
    title: "Event not found",
    message: "This event doesn't exist, or it hasn't been published yet.",
  },
  NOT_FOUND: { title: "Page not found", message: "We couldn't find what you were looking for." },
  EVENT_FULL: {
    title: "This event is full",
    message: "Every spot has been taken. Have a look at what else is coming up.",
  },
  EVENT_NOT_PUBLISHED: {
    title: "Not open yet",
    message: "Registration opens once this event has been reviewed and published.",
  },
  REGISTRATION_CLOSED: {
    title: "Registration has closed",
    message: "This event has already started.",
  },
  INVALID_STATUS_TRANSITION: {
    title: "Already handled",
    message: "This event's status changed in the meantime. We've refreshed the list.",
  },
  EVENT_ALREADY_STARTED: {
    title: "Too late to publish",
    message: "This event has already started, so it can't be published.",
  },
  ADMIN_ONLY: { title: "Admins only", message: "Switch to the Admin view to do this." },
  ORGANISER_ONLY: { title: "Organisers only", message: "Switch to an organiser to manage events." },
  NOT_EVENT_OWNER: {
    title: "Not your event",
    message: "You can only edit events you organise.",
  },
  UNKNOWN_ORGANISER: {
    title: "Pick an organiser",
    message: "Choose one of the demo organisers in the Viewing as menu.",
  },
  VALIDATION_ERROR: {
    title: "Check the highlighted fields",
    message: "Some details need fixing before we can continue.",
  },
};

export function toFriendlyError(error: unknown): FriendlyError {
  if (error instanceof ApiError) {
    const copy = COPY[error.code];
    return {
      title: copy?.title ?? "Something went wrong",
      message: copy?.message ?? error.message,
      retryable: error.isTransient,
    };
  }
  return {
    title: "Something went wrong",
    message: "An unexpected problem occurred. Try again.",
    retryable: true,
  };
}

export function requestIdOf(error: unknown): string | undefined {
  return error instanceof ApiError ? error.requestId : undefined;
}
