import { ArrowLeft, Building2, CalendarDays, Clock, Eye, MapPin, Pencil, SearchX } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { Callout, EmptyState, ErrorState } from "@/components/ui/States";
import { PublishButton, RequestChangesButton } from "@/features/admin/publish";
import { RegisterPanel } from "@/features/registrations/RegisterPanel";
import { useSwitchViewer } from "@/features/role/useSwitchViewer";
import { ROLE_META } from "@/features/role/roles";
import { useViewer } from "@/features/role/viewer-context";
import { ApiError } from "@/lib/api/client";
import type { CommunityEvent } from "@/lib/api/types";
import { formatLongDate, formatTime, timeZoneLabel } from "@/lib/format";

import { CapacityMeter, StatusBadge } from "./components/EventBits";
import { useEvent } from "./queries";

export default function EventDetailPage() {
  const { eventId = "" } = useParams();
  const query = useEvent(eventId);
  const { viewer } = useViewer();
  const back = viewer.role === "visitor" ? { to: "/", label: "All events" } : { to: ROLE_META[viewer.role].home, label: viewer.role === "admin" ? "Review queue" : "My events" };

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to={back.to}
        className="mb-5 inline-flex h-11 items-center gap-1.5 rounded-md text-sm font-medium text-fg-muted hover:text-fg sm:h-auto"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {back.label}
      </Link>

      {query.isPending ? (
        <DetailSkeleton />
      ) : query.isError ? (
        query.error instanceof ApiError && query.error.code === "EVENT_NOT_FOUND" ? (
          <EmptyState
            icon={<SearchX />}
            title="We couldn't find that event"
            description="It may have been removed, or it hasn't been published yet. Unpublished events are only visible to their organiser and admins."
            action={
              <Button asChild variant="primary">
                <Link to="/">Browse events</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        )
      ) : (
        <EventDetail event={query.data} />
      )}
    </div>
  );
}

function EventDetail({ event }: { event: CommunityEvent }) {
  const { viewer } = useViewer();
  const isOwner = viewer.role === "organiser" && viewer.organiserId === event.organiser.id;

  return (
    <article>
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{event.category_label}</Badge>
          {event.status !== "PUBLISHED" && <StatusBadge status={event.status} explain />}
          <span className="font-mono text-xs text-fg-subtle">{event.id}</span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{event.title}</h1>
        <p className="mt-2 flex items-center gap-1.5 text-fg-muted">
          <Building2 className="size-4" aria-hidden="true" />
          Hosted by {event.organiser.name}
        </p>
      </header>

      {event.status === "PENDING_REVIEW" && (isOwner || viewer.role === "admin") && (
        <Callout tone="warning" icon={<Eye />} title="Waiting for review" className="mt-6">
          Only {isOwner ? "you" : "the organiser"} and admins can see this event. Registration opens once it's
          published.
        </Callout>
      )}
      {event.status === "REJECTED" && isOwner && (
        <Callout tone="danger" icon={<Pencil />} title="An admin requested changes" className="mt-6">
          {event.review_note ? <span className="whitespace-pre-line">“{event.review_note}”</span> : "Update the event to resubmit it for review."}
        </Callout>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <dl className="grid gap-4 rounded-xl border border-border bg-surface p-5 shadow-card sm:grid-cols-2">
            <Detail icon={<CalendarDays />} label="Date">
              {formatLongDate(event.starts_at)}
            </Detail>
            <Detail icon={<Clock />} label="Time">
              {formatTime(event.starts_at)}{" "}
              <span className="text-fg-subtle">({timeZoneLabel(new Date(event.starts_at))}, your local time)</span>
            </Detail>
            <Detail icon={<MapPin />} label="Location">
              {event.location || <span className="text-fg-subtle">To be confirmed</span>}
            </Detail>
            <Detail icon={<Building2 />} label="Organiser">
              {event.organiser.name}
            </Detail>
          </dl>

          <section className="mt-8" aria-labelledby="about-heading">
            <h2 id="about-heading" className="text-lg font-semibold">
              About this event
            </h2>
            {/* Plain text on purpose: React escapes it, and line breaks are kept with CSS. */}
            <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-fg-muted">
              {event.description || "The organiser hasn't added a description yet."}
            </p>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Registration">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-sm font-medium">Spots</span>
              <span className="text-sm tabular-nums text-fg-muted">
                <span className="text-2xl font-semibold text-fg">{event.registered_count}</span> / {event.capacity}{" "}
                taken
              </span>
            </div>
            <CapacityMeter event={event} size="lg" />
            <div className="mt-5">
              <ActionsFor event={event} isOwner={isOwner} />
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}

/** Only the actions the current role can actually perform. */
function ActionsFor({ event, isOwner }: { event: CommunityEvent; isOwner: boolean }) {
  const { viewer } = useViewer();
  const switchTo = useSwitchViewer();

  if (viewer.role === "visitor") {
    return event.status === "PUBLISHED" ? <RegisterPanel event={event} /> : null;
  }

  if (isOwner) {
    return (
      <div className="space-y-3">
        <Button asChild variant="primary" className="w-full">
          <Link to={`/organiser/events/${event.id}/edit`}>
            <Pencil className="size-4" aria-hidden="true" />
            {event.status === "REJECTED" ? "Edit and resubmit" : "Edit event"}
          </Link>
        </Button>
        <p className="text-center text-xs text-fg-subtle">You organise this event.</p>
      </div>
    );
  }

  if (viewer.role === "admin" && event.status === "PENDING_REVIEW") {
    return (
      <div className="flex flex-col gap-2">
        <PublishButton event={event} size="md" />
        <RequestChangesButton event={event} size="md" />
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-surface-muted p-3.5 text-sm text-fg-muted">
      <p>Registering interest is something visitors do.</p>
      <button
        type="button"
        onClick={() => switchTo({ role: "visitor", organiserId: null })}
        className="mt-1 font-medium text-accent-text underline-offset-4 hover:underline"
      >
        Switch to Visitor to try it
      </button>
    </div>
  );
}

function Detail({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-surface-muted text-fg-muted [&>svg]:size-[18px]" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-fg-subtle">{label}</dt>
        <dd className="mt-0.5 text-sm font-medium">{children}</dd>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <LoadingRegion label="Loading event">
      <Skeleton className="h-6 w-28 rounded-full" />
      <Skeleton className="mt-4 h-10 w-3/4" />
      <Skeleton className="mt-3 h-5 w-56" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="mt-8 h-6 w-40" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-11/12" />
          <Skeleton className="mt-2 h-4 w-2/3" />
        </div>
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    </LoadingRegion>
  );
}
