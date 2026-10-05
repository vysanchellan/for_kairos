/**
 * The one place the app talks HTTP.
 *
 * - Adds the demo-role headers for whoever the user is "viewing as".
 * - Adds an X-Request-ID, so a failure in the UI can be matched to server logs.
 * - Turns every failure (HTTP error, network down, proxy error, bad JSON) into
 *   a typed ApiError, so components handle one error type.
 */

import type { ApiErrorBody, Role } from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;
  readonly requestId?: string;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.fields = body.fields ?? {};
    this.requestId = body.request_id;
  }

  /** True when retrying might help (server/network trouble, not a rule being broken). */
  get isTransient(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

interface Identity {
  role: Role;
  organiserId: string | null;
}

let identity: Identity = { role: "visitor", organiserId: null };

/** Called by RoleProvider whenever the user switches who they're viewing as. */
export function setApiIdentity(next: Identity): void {
  identity = next;
}

function newRequestId(): string {
  return crypto.randomUUID();
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Request-ID": newRequestId(),
    "X-Demo-Role": identity.role,
  };
  if (identity.role === "organiser" && identity.organiserId) {
    headers["X-Demo-Organiser-Id"] = identity.organiserId;
  }
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, {
      code: "NETWORK_ERROR",
      message: "We can't reach the server. Check your connection and try again.",
    });
  }

  const isJson = response.headers.get("Content-Type")?.includes("application/json");
  const payload: unknown = isJson ? await response.json().catch(() => null) : null;

  if (response.ok) {
    return payload as T;
  }

  if (isApiErrorBody(payload)) {
    throw new ApiError(response.status, payload);
  }

  // Not our JSON error shape: usually the dev proxy saying Django isn't running.
  const unavailable = response.status === 502 || response.status === 503 || response.status === 504;
  throw new ApiError(response.status, {
    code: unavailable ? "SERVICE_UNAVAILABLE" : "UNEXPECTED_RESPONSE",
    message: unavailable
      ? "The events service isn't responding right now. Try again in a moment."
      : "Something went wrong on our side. Try again.",
    request_id: response.headers.get("X-Request-ID") ?? undefined,
  });
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ApiErrorBody).code === "string" &&
    typeof (value as ApiErrorBody).message === "string"
  );
}
