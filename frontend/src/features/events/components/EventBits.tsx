/** Small, event-specific building blocks reused across visitor, organiser and admin views. */

import { CircleHelp } from "lucide-react";

import { Badge, type Tone } from "@/components/ui/Badge";
import { Tooltip } from "@/components/ui/Tooltip";
import type { CommunityEvent, EventStatus } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatDateBlock } from "@/lib/format";

import { capacityLabel, capacityState } from "../capacity";

export function DateBlock({ iso, size = "md" }: { iso: string; size?: "md" | "lg" }) {
  const { month, day, weekday } = formatDateBlock(iso);
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-surface-muted text-center",
        size === "lg" ? "w-16 py-2" : "w-14 py-1.5",
      )}
      aria-hidden="true"
    >
      <span className="text-[10px] font-semibold tracking-wider text-accent-text">{month}</span>
      <span className={cn("font-semibold leading-none tabular-nums", size === "lg" ? "text-2xl" : "text-xl")}>
        {day}
      </span>
      <span className="mt-0.5 text-[10px] font-medium text-fg-subtle">{weekday}</span>
    </div>
  );
}

/** A progress bar of registrations against capacity, with the "Only 3 spots left" / "Full" states. */
export function CapacityMeter({
  event,
  size = "sm",
  showCounts = true,
}: {
  event: Pick<CommunityEvent, "capacity" | "registered_count" | "spots_remaining">;
  size?: "sm" | "lg";
  showCounts?: boolean;
}) {
  const state = capacityState(event);
  const percent = Math.min(100, Math.round((event.registered_count / event.capacity) * 100));
  const bar = { open: "bg-accent", low: "bg-warning", full: "bg-fg-subtle" }[state];
  const text = { open: "text-fg-muted", low: "text-warning", full: "text-fg-muted" }[state];

  return (
    <div>
      <div
        role="meter"
        aria-label="Spots taken"
        aria-valuemin={0}
        aria-valuemax={event.capacity}
        aria-valuenow={event.registered_count}
        aria-valuetext={`${event.registered_count} of ${event.capacity} spots taken. ${capacityLabel(event)}.`}
        className={cn("overflow-hidden rounded-full bg-surface-sunken", size === "lg" ? "h-2.5" : "h-1.5")}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", bar)}
          style={{ width: `${Math.max(percent, event.registered_count > 0 ? 3 : 0)}%` }}
        />
      </div>
      {showCounts && (
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <span className={cn("font-medium", text)}>{capacityLabel(event)}</span>
          <span className="tabular-nums text-fg-subtle">
            {event.registered_count}/{event.capacity}
          </span>
        </div>
      )}
    </div>
  );
}

const STATUS: Record<EventStatus, { tone: Tone; label: string; help: string }> = {
  PENDING_REVIEW: {
    tone: "warning",
    label: "Pending review",
    help: "An admin will review this event before it goes live. Until then, only you and admins can see it.",
  },
  PUBLISHED: {
    tone: "success",
    label: "Published",
    help: "Live and visible to everyone. Visitors can register interest.",
  },
  REJECTED: {
    tone: "danger",
    label: "Changes requested",
    help: "An admin asked for changes. Edit the event to resubmit it for review.",
  },
};

export function StatusBadge({ status, explain = false }: { status: EventStatus; explain?: boolean }) {
  const meta = STATUS[status];
  const badge = (
    <Badge tone={meta.tone} dot>
      {meta.label}
      {explain && <CircleHelp className="-mr-0.5 size-3.5 opacity-70" aria-hidden="true" />}
    </Badge>
  );
  if (!explain) return badge;
  return (
    <Tooltip content={meta.help}>
      <button type="button" className="rounded-full" aria-label={`${meta.label}: ${meta.help}`}>
        {badge}
      </button>
    </Tooltip>
  );
}
