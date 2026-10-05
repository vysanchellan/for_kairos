import { ArrowLeft, Building2, CalendarDays, Clock, Eye, MapPin, Pencil, SearchX } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router";

import { CountUp, CoverImage } from "@/components/motion/primitives";
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
import { formatDateBlock, formatLongDate, formatTime, timeZoneLabel } from "@/lib/format";
import { ease } from "@/lib/motion";

import { CapacityMeter, StatusBadge } from "./components/EventBits";
import { coverFor, coverTransitionName } from "./covers";
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
        viewTransition
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
      <EventHero event={event} />

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
                <CountUp value={event.registered_count} className="text-2xl font-semibold text-fg" /> / {event.capacity}{" "}
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

/** Photo hero with a gentle scroll parallax; its image shares a view-transition name with the event card. */
function EventHero({ event }: { event: CommunityEvent }) {
  const cover = coverFor(event);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 90]);
  const scale = useTransform(scrollY, [0, 500], [1, 1.08]);
  const date = formatDateBlock(event.starts_at);

  return (
    <header className="relative isolate -mx-4 overflow-hidden bg-slate-950 text-white sm:mx-0 sm:rounded-3xl">
      <motion.div className="absolute inset-0 -z-10" style={{ y, scale }} aria-hidden="true">
        <CoverImage
          cover={cover}
          alt=""
          priority
          sizes="(min-width: 1024px) 1024px, 100vw"
          transitionName={coverTransitionName(event.id)}
          className="h-full w-full"
        />
      </motion.div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-slate-950/10" />

      <div className="flex min-h-[320px] flex-col justify-end gap-4 p-6 sm:min-h-[420px] sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease, delay: 0.15 }}
          className="flex items-end justify-between gap-6"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium ring-1 ring-white/25 backdrop-blur-md">
                {event.category_label}
              </span>
              {event.status !== "PUBLISHED" && <StatusBadge status={event.status} explain />}
              <span className="font-mono text-xs text-white/60">{event.id}</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">{event.title}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-white/80">
              <Building2 className="size-4" aria-hidden="true" />
              Hosted by {event.organiser.name}
            </p>
          </div>
          <div
            aria-hidden="true"
            className="hidden shrink-0 flex-col items-center rounded-2xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/20 backdrop-blur-md sm:flex"
          >
            <span className="text-xs font-semibold tracking-wider text-indigo-200">{date.month}</span>
            <span className="text-3xl font-semibold leading-none tabular-nums">{date.day}</span>
            <span className="mt-0.5 text-xs text-white/70">{date.weekday}</span>
          </div>
        </motion.div>
      </div>
      <p className="absolute right-4 top-3 text-[10px] text-white/50">
        Photo:{" "}
        <a href={cover.creditUrl} target="_blank" rel="noreferrer" className="hover:text-white/90 hover:underline">
          {cover.author}
        </a>{" "}
        / Unsplash
      </p>
    </header>
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
