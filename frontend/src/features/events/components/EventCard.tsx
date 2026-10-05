import { Clock, MapPin } from "lucide-react";
import { Link } from "react-router";

import { Skeleton } from "@/components/ui/Skeleton";
import type { CommunityEvent } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";

import { CapacityMeter, DateBlock, StatusBadge } from "./EventBits";

type CardEvent = Pick<
  CommunityEvent,
  | "id"
  | "title"
  | "category_label"
  | "location"
  | "starts_at"
  | "capacity"
  | "registered_count"
  | "spots_remaining"
  | "status"
  | "organiser"
>;

/**
 * The event card. The whole card is clickable, but only the title is a link
 * (a stretched ::after covers the card), so screen readers hear one clear
 * link per card rather than a wall of text.
 */
export function EventCard({ event, preview = false }: { event: CardEvent; preview?: boolean }) {
  const title = event.title || "Untitled event";
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col rounded-xl border border-border bg-surface p-4 shadow-card transition-[box-shadow,border-color,transform] duration-200 ease-out",
        !preview && "hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lift focus-within:border-accent/50",
      )}
    >
      <div className="flex gap-3.5">
        <DateBlock iso={event.starts_at} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-medium text-fg-subtle">
            <span className="truncate text-accent-text">{event.category_label}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <Clock className="size-3" aria-hidden="true" />
              {formatTime(event.starts_at)}
            </span>
          </div>
          <h3 className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug">
            {preview ? (
              title
            ) : (
              <Link
                to={`/events/${event.id}`}
                className="rounded-sm after:absolute after:inset-0 after:rounded-xl focus:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-focus"
              >
                {title}
              </Link>
            )}
          </h3>
          <p className="mt-1 truncate text-sm text-fg-muted">{event.organiser.name}</p>
        </div>
      </div>

      <div className="mt-auto pt-4">
        {event.location && (
          <p className="mb-3 flex items-center gap-1.5 truncate text-xs text-fg-subtle">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{event.location}</span>
          </p>
        )}
        {event.status === "PUBLISHED" ? (
          <CapacityMeter event={event} />
        ) : (
          <div className="flex items-center justify-between">
            <StatusBadge status={event.status} />
            <span className="text-xs text-fg-subtle">{event.capacity} spots</span>
          </div>
        )}
      </div>
    </article>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-surface p-4 shadow-card">
      <div className="flex gap-3.5">
        <Skeleton className="h-[66px] w-14 rounded-lg" />
        <div className="flex-1 space-y-2 pt-0.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3.5 w-32" />
        </div>
      </div>
      <div className="mt-auto space-y-3 pt-4">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-1.5 w-full rounded-full" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-8" />
        </div>
      </div>
    </div>
  );
}
