/** Types mirroring the Django REST API (see /api/docs/ for the OpenAPI schema). */

export type Role = "visitor" | "organiser" | "admin";

export type EventStatus = "PENDING_REVIEW" | "PUBLISHED" | "REJECTED";

export type EventCategory =
  | "community"
  | "arts"
  | "tech"
  | "outdoors"
  | "food"
  | "wellbeing"
  | "learning";

export interface Organiser {
  id: string;
  name: string;
}

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  category_label: string;
  location: string;
  starts_at: string;
  capacity: number;
  registered_count: number;
  spots_remaining: number;
  is_full: boolean;
  status: EventStatus;
  status_label: string;
  review_note: string;
  organiser: Organiser;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Paginated<T> {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: T[];
}

export interface EventInput {
  title: string;
  description: string;
  category: EventCategory;
  location: string;
  starts_at: string;
  capacity: number;
}

export interface RegistrationResult {
  id: string;
  event_id: string;
  created_at: string;
  registered_count: number;
  spots_remaining: number;
}

export type ActivityKind =
  | "EVENT_CREATED"
  | "EVENT_UPDATED"
  | "EVENT_PUBLISHED"
  | "EVENT_REJECTED"
  | "REGISTRATION_CREATED";

export interface ActivityEntry {
  id: number;
  kind: ActivityKind;
  kind_label: string;
  message: string;
  actor: string;
  event: { id: string; title: string; status: EventStatus };
  registration_id: string;
  created_at: string;
}

export interface EventStats {
  total: number;
  pending: number;
  published: number;
  changes_requested: number;
  registrations?: number;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  fields?: Record<string, string>;
  request_id?: string;
}
