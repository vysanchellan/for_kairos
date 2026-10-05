import { Clock, MapPin } from "lucide-react";
import { Link } from "react-router";

import { CoverImage, TiltCard } from "@/components/motion/primitives";
import { Skeleton } from "@/components/ui/Skeleton";
import type { CommunityEvent } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatDateBlock, formatTime } from "@/lib/format";

import { coverFor, coverTransitionName } from "../covers";
import { CapacityMeter, StatusBadge } from "./EventBits";

type CardEvent = Pick<
  CommunityEvent,
  | "id"
  | "title"
  | "category"
  | "category_label"
  | "cover_image"
  | "location"
  | "starts_at"
  | "capacity"
  | "registered_count"
  | "spots_remaining"
  | "status"
  | "organiser"
>;

/**
 * The event card: a photo header with glass date and category badges, then the
 * details. The whole card is clickable, but only the title is a link (a
 * stretched ::after covers the card), so screen readers hear one link.
 */
export function EventCard({ event, preview = false }: { event: CardEvent; preview?: boolean }) {
  const title = event.title || "Untitled event";
  const cover = coverFor(event);
  const date = formatDateBlock(event.starts_at);

  const card = (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition-[box-shadow,border-color] duration-300",
        !preview && "hover:border-border-strong hover:shadow-lift focus-within:border-accent/50",
      )}
    >
      <div className="relative">
        <CoverImage
          cover={cover}
          className="aspect-[16/10]"
          imgClassName={cn(!preview && "group-hover:scale-[1.06] duration-[900ms]")}
          transitionName={preview ? undefined : coverTransitionName(event.id)}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/10" />
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-medium text-white ring-1 ring-white/20 backdrop-blur-md">
          {event.category_label}
        </div>
        <div
          className="absolute right-3 top-3 flex w-12 flex-col items-center rounded-xl bg-white/85 py-1 text-center text-slate-900 shadow-sm ring-1 ring-black/5 backdrop-blur-md dark:bg-slate-950/70 dark:text-white dark:ring-white/10"
          aria-hidden="true"
        >
          <span className="text-[10px] font-semibold tracking-wider text-accent-text">{date.month}</span>
          <span className="text-lg font-semibold leading-none tabular-nums">{date.day}</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-300">{date.weekday}</span>
        </div>
        <p className="absolute bottom-2.5 left-3 inline-flex items-center gap-1 text-xs font-medium text-white/95 drop-shadow">
          <Clock className="size-3.5" aria-hidden="true" />
          {formatTime(event.starts_at)}
        </p>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-[16px] font-semibold leading-snug tracking-tight">
          {preview ? (
            title
          ) : (
            <Link
              to={`/events/${event.id}`}
              viewTransition
              className="rounded-sm after:absolute after:inset-0 after:z-10 after:rounded-2xl focus:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-focus"
            >
              {title}
            </Link>
          )}
        </h3>
        <p className="mt-1 truncate text-sm text-fg-muted">{event.organiser.name}</p>
        {event.location && (
          <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-fg-subtle">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{event.location}</span>
          </p>
        )}
        <div className="mt-auto pt-4">
          {event.status === "PUBLISHED" ? (
            <CapacityMeter event={event} />
          ) : (
            <div className="flex items-center justify-between">
              <StatusBadge status={event.status} />
              <span className="text-xs text-fg-subtle">{event.capacity} spots</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );

  return preview ? card : <TiltCard>{card}</TiltCard>;
}

export function EventCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-3 w-2/5" />
        <div className="pt-3">
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
