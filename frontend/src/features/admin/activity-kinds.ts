import { CalendarPlus, CircleCheck, MessageSquareWarning, Pencil, Ticket, type LucideIcon } from "lucide-react";

import type { ActivityKind } from "@/lib/api/types";

export const KIND_META: Record<ActivityKind, { icon: LucideIcon; tone: string; label: string }> = {
  EVENT_PUBLISHED: { icon: CircleCheck, tone: "bg-success-soft text-success", label: "Published" },
  REGISTRATION_CREATED: { icon: Ticket, tone: "bg-accent-soft text-accent-text", label: "Registrations" },
  EVENT_CREATED: { icon: CalendarPlus, tone: "bg-warning-soft text-warning", label: "Submitted" },
  EVENT_UPDATED: { icon: Pencil, tone: "bg-surface-muted text-fg-muted", label: "Updated" },
  EVENT_REJECTED: { icon: MessageSquareWarning, tone: "bg-danger-soft text-danger", label: "Changes requested" },
};
