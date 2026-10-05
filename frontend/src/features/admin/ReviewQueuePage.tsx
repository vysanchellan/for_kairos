import { ArrowRight, CalendarRange, CheckCircle2, Hourglass, Inbox, MapPin, MessageSquareWarning, PartyPopper } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ToggleGroup } from "radix-ui";
import { useState } from "react";
import { Link } from "react-router";

import { PageHeader, StatTile } from "@/components/ui/PageHeader";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { EventThumb, StatusBadge } from "@/features/events/components/EventBits";
import { RoleGate } from "@/features/role/RoleGate";
import type { CommunityEvent } from "@/lib/api/types";
import { formatRelative, formatShortDateTime, pluralise } from "@/lib/format";
import { ease } from "@/lib/motion";

import { ActivityList, ActivitySkeleton } from "./ActivityFeed";
import { PublishButton, RequestChangesButton } from "./publish";
import { useActivity, useAdminEvents, useAdminStats } from "./queries";

export default function ReviewQueuePageRoute() {
  return (
    <RoleGate role="admin">
      <ReviewQueuePage />
    </RoleGate>
  );
}

type View = "queue" | "all";

function ReviewQueuePage() {
  const [view, setView] = useState<View>("queue");
  const stats = useAdminStats();
  // One query for everything; the queue is a client-side filter, so a just-published
  // event can animate out of the queue the moment its status flips.
  const events = useAdminEvents();
  const pending = stats.data?.pending;

  const visible =
    events.data?.results.filter((e) => view === "all" || e.status === "PENDING_REVIEW") ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Review queue"
        description={
          pending === undefined
            ? "Events waiting for a decision."
            : pending === 0
              ? "You're all caught up. Nothing is waiting for review."
              : `${pluralise(pending, "event")} awaiting review.`
        }
      />

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.isPending || stats.isError ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[98px] rounded-xl" />)
        ) : (
          <>
            <StatTile label="Awaiting review" value={stats.data.pending} icon={<Hourglass />} />
            <StatTile label="Published" value={stats.data.published} icon={<CheckCircle2 />} />
            <StatTile label="Changes requested" value={stats.data.changes_requested} icon={<MessageSquareWarning />} />
            <StatTile label="All events" value={stats.data.total} icon={<CalendarRange />} />
          </>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="queue-heading" className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="queue-heading" tabIndex={-1} className="text-lg font-semibold focus:outline-none">
              {view === "queue" ? "Awaiting review" : "All events"}
            </h2>
            <ToggleGroup.Root
              type="single"
              value={view}
              onValueChange={(v) => v && setView(v as View)}
              aria-label="Which events to show"
              className="flex gap-1 rounded-lg border border-border bg-surface-muted p-1"
            >
              {(
                [
                  ["queue", `Awaiting review${pending ? ` (${pending})` : ""}`],
                  ["all", "All events"],
                ] as const
              ).map(([value, label]) => (
                <ToggleGroup.Item
                  key={value}
                  value={value}
                  className="h-11 flex-1 whitespace-nowrap rounded-md px-3 text-sm font-medium text-fg-muted transition-colors hover:text-fg data-[state=on]:bg-surface data-[state=on]:text-fg data-[state=on]:shadow-xs sm:h-8 sm:flex-none"
                >
                  {label}
                </ToggleGroup.Item>
              ))}
            </ToggleGroup.Root>
          </div>

          {events.isPending ? (
            <LoadingRegion label="Loading events">
              <div className="space-y-3">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-[148px] rounded-xl" />
                ))}
              </div>
            </LoadingRegion>
          ) : events.isError ? (
            <ErrorState error={events.error} onRetry={() => void events.refetch()} compact />
          ) : visible.length === 0 ? (
            view === "queue" ? (
              <EmptyState
                icon={<PartyPopper />}
                title="You're all caught up"
                description="New events from organisers will appear here for review."
              />
            ) : (
              <EmptyState icon={<Inbox />} title="No events yet" description="Events appear here once organisers create them." />
            )
          ) : (
            <ul className="space-y-3">
              <AnimatePresence initial={false}>
                {visible.map((event) => (
                  <motion.li
                    key={event.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 24, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.25, ease }}
                  >
                    <ReviewRow event={event} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>

        <RecentActivity />
      </div>
    </div>
  );
}

function ReviewRow({ event }: { event: CommunityEvent }) {
  const pending = event.status === "PENDING_REVIEW";
  return (
    <article className="rounded-xl border border-border bg-surface p-4 shadow-xs sm:p-5">
      <div className="flex gap-3.5">
        <EventThumb event={event} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={event.status} />
            <span className="text-xs text-fg-subtle">{event.category_label}</span>
            <span className="font-mono text-[11px] text-fg-subtle">{event.id}</span>
          </div>
          <h3 className="mt-1.5 font-semibold">
            <Link to={`/events/${event.id}`} className="hover:underline hover:underline-offset-4">
              {event.title}
            </Link>
          </h3>
          <p className="mt-0.5 text-sm text-fg-muted">
            {event.organiser.name} · {formatShortDateTime(event.starts_at)} · {event.capacity} spots
          </p>
          {event.location && (
            <p className="mt-1 flex items-center gap-1 text-xs text-fg-subtle">
              <MapPin className="size-3.5" aria-hidden="true" />
              {event.location}
            </p>
          )}
          {event.description && (
            <p className="mt-2 line-clamp-2 text-sm text-fg-muted">{event.description}</p>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-fg-subtle">
          {pending ? `Submitted ${formatRelative(event.created_at)}` : event.status === "PUBLISHED" && event.published_at ? `Published ${formatRelative(event.published_at)}` : `Updated ${formatRelative(event.updated_at)}`}
        </p>
        {pending && (
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <RequestChangesButton event={event} returnFocusTo="queue-heading" />
            <PublishButton event={event} returnFocusTo="queue-heading" />
          </div>
        )}
      </div>
    </article>
  );
}

function RecentActivity() {
  const activity = useActivity();
  const entries = activity.data?.pages[0]?.results.slice(0, 6) ?? [];
  return (
    <aside aria-labelledby="recent-activity" className="lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="recent-activity" className="font-semibold">
            Recent activity
          </h2>
          <span className="flex items-center gap-1.5 text-xs text-fg-subtle">
            <span className="size-1.5 animate-pulse rounded-full bg-success" aria-hidden="true" />
            Live
          </span>
        </div>
        {activity.isPending ? (
          <ActivitySkeleton rows={4} />
        ) : activity.isError ? (
          <ErrorState error={activity.error} onRetry={() => void activity.refetch()} compact plain />
        ) : entries.length === 0 ? (
          <p className="text-sm text-fg-muted">Publishing and registrations will show up here.</p>
        ) : (
          <ActivityList entries={entries} compact />
        )}
        <Link
          to="/admin/activity"
          className="mt-5 flex h-11 items-center justify-center gap-1.5 rounded-md border border-border text-sm font-medium transition-colors hover:bg-surface-muted sm:h-9"
        >
          View all activity
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
