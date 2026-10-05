/** Typed endpoint functions and React Query keys. Components never build URLs themselves. */

import { apiRequest } from "./client";
import type {
  ActivityEntry,
  ActivityKind,
  CommunityEvent,
  EventCategory,
  EventInput,
  EventStats,
  EventStatus,
  Organiser,
  Paginated,
  PublicStats,
  RegistrationResult,
} from "./types";

export interface PublicEventFilters {
  category?: EventCategory;
  upcoming: boolean;
  q?: string;
}

function query(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

/**
 * Query keys are namespaced by who is asking, because the same URL returns
 * different data for different roles (an organiser can see their pending events).
 */
export const queryKeys = {
  publicEvents: (filters: PublicEventFilters) => ["events", "public", filters] as const,
  event: (id: string, viewer: string) => ["events", "detail", id, viewer] as const,
  myEvents: (organiserId: string, status?: EventStatus) => ["events", "mine", organiserId, status ?? "all"] as const,
  myStats: (organiserId: string) => ["stats", "organiser", organiserId] as const,
  adminEvents: (status?: EventStatus) => ["events", "admin", status ?? "all"] as const,
  adminStats: () => ["stats", "admin"] as const,
  activity: (kind?: ActivityKind) => ["activity", kind ?? "all"] as const,
  organisers: () => ["organisers"] as const,
  publicStats: () => ["stats", "public"] as const,
};

export const api = {
  listPublicEvents: (filters: PublicEventFilters, page: number, signal?: AbortSignal) =>
    apiRequest<Paginated<CommunityEvent>>(
      `/events/${query({ category: filters.category, upcoming: filters.upcoming, q: filters.q, page })}`,
      { signal },
    ),

  getEvent: (id: string, signal?: AbortSignal) =>
    apiRequest<CommunityEvent>(`/events/${encodeURIComponent(id)}/`, { signal }),

  createEvent: (input: EventInput) =>
    apiRequest<CommunityEvent>("/events/", { method: "POST", body: input }),

  updateEvent: (id: string, input: Partial<EventInput>) =>
    apiRequest<CommunityEvent>(`/events/${encodeURIComponent(id)}/`, { method: "PATCH", body: input }),

  register: (id: string) =>
    apiRequest<RegistrationResult>(`/events/${encodeURIComponent(id)}/registrations/`, { method: "POST" }),

  listMyEvents: (status: EventStatus | undefined, page: number, signal?: AbortSignal) =>
    apiRequest<Paginated<CommunityEvent>>(`/organiser/events/${query({ status, page, page_size: 50 })}`, { signal }),

  myStats: (signal?: AbortSignal) => apiRequest<EventStats>("/organiser/stats/", { signal }),

  listAdminEvents: (status: EventStatus | undefined, page: number, signal?: AbortSignal) =>
    apiRequest<Paginated<CommunityEvent>>(`/admin/events/${query({ status, page, page_size: 50 })}`, { signal }),

  adminStats: (signal?: AbortSignal) => apiRequest<EventStats>("/admin/stats/", { signal }),

  publishEvent: (id: string) =>
    apiRequest<CommunityEvent>(`/admin/events/${encodeURIComponent(id)}/publish/`, { method: "POST" }),

  rejectEvent: (id: string, note: string) =>
    apiRequest<CommunityEvent>(`/admin/events/${encodeURIComponent(id)}/reject/`, {
      method: "POST",
      body: { note },
    }),

  listActivity: (kind: ActivityKind | undefined, page: number, signal?: AbortSignal) =>
    apiRequest<Paginated<ActivityEntry>>(`/admin/activity/${query({ kind, page, page_size: 20 })}`, { signal }),

  publicStats: (signal?: AbortSignal) => apiRequest<PublicStats>("/stats/", { signal }),

  listOrganisers: (signal?: AbortSignal) => apiRequest<Organiser[]>("/organisers/", { signal }),
};
