import { CalendarPlus, CalendarRange, CheckCircle2, Clock3, Hourglass, MapPin, Pencil, Users } from "lucide-react";
import { ToggleGroup } from "radix-ui";
import { useState } from "react";
import { Link } from "react-router";

import { Button } from "@/components/ui/Button";
import { PageHeader, StatTile } from "@/components/ui/PageHeader";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { Callout, EmptyState, ErrorState } from "@/components/ui/States";
import { CapacityMeter, DateBlock, StatusBadge } from "@/features/events/components/EventBits";
import { RoleGate } from "@/features/role/RoleGate";
import { organiserName, useOrganisers } from "@/features/role/useSwitchViewer";
import { useViewer } from "@/features/role/viewer-context";
import type { CommunityEvent, EventStatus } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatShortDateTime, pluralise } from "@/lib/format";

import { useMyEvents, useMyStats } from "./queries";

export default function OrganiserDashboardPage() {
  return (
    <RoleGate role="organiser">
      <OrganiserDashboard />
    </RoleGate>
  );
}

const FILTERS: Array<{ value: EventStatus | "all"; label: string; stat?: "pending" | "published" | "changes_requested" | "total" }> = [
  { value: "all", label: "All", stat: "total" },
  { value: "PENDING_REVIEW", label: "Pending review", stat: "pending" },
  { value: "PUBLISHED", label: "Published", stat: "published" },
  { value: "REJECTED", label: "Changes requested", stat: "changes_requested" },
];

function OrganiserDashboard() {
  const { viewer } = useViewer();
  const { data: organisers } = useOrganisers();
  const [filter, setFilter] = useState<EventStatus | "all">("all");
  const stats = useMyStats();
  const events = useMyEvents(filter === "all" ? undefined : filter);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={organiserName(organisers, viewer.organiserId)}
        title="Your events"
        description="Create events, keep an eye on interest, and make changes."
        actions={
          <Button asChild variant="primary">
            <Link to="/organiser/events/new">
              <CalendarPlus className="size-4" aria-hidden="true" />
              New event
            </Link>
          </Button>
        }
      />

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.isPending || stats.isError ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[98px] rounded-xl" />)
        ) : (
          <>
            <StatTile label="Total events" value={stats.data.total} icon={<CalendarRange />} />
            <StatTile label="Awaiting review" value={stats.data.pending} icon={<Hourglass />} />
            <StatTile label="Published" value={stats.data.published} icon={<CheckCircle2 />} />
            <StatTile
              label="Registrations"
              value={stats.data.registrations ?? 0}
              icon={<Users />}
              hint="Across all your events"
            />
          </>
        )}
      </section>

      {stats.data && stats.data.pending > 0 && (
        <Callout tone="accent" icon={<Clock3 />} title={`${pluralise(stats.data.pending, "event")} waiting for review`}>
          New events stay hidden from visitors until an admin publishes them. You can still edit them in the meantime.
        </Callout>
      )}

      <section aria-labelledby="my-events-heading">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="my-events-heading" className="text-lg font-semibold">
            Events
          </h2>
          <ToggleGroup.Root
            type="single"
            value={filter}
            onValueChange={(v) => v && setFilter(v as EventStatus | "all")}
            aria-label="Filter by status"
            className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:rounded-lg sm:border sm:border-border sm:bg-surface-muted sm:p-1 sm:px-1"
          >
            {FILTERS.map((f) => (
              <ToggleGroup.Item
                key={f.value}
                value={f.value}
                className="inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium text-fg-muted transition-colors hover:text-fg data-[state=on]:bg-surface data-[state=on]:text-fg data-[state=on]:shadow-xs sm:h-8"
              >
                {f.label}
                {stats.data && f.stat && (
                  <span className="rounded-full bg-surface-sunken px-1.5 text-xs tabular-nums text-fg-subtle">
                    {stats.data[f.stat]}
                  </span>
                )}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
        </div>

        {events.isPending ? (
          <LoadingRegion label="Loading your events">
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-[104px] rounded-xl" />
              ))}
            </div>
          </LoadingRegion>
        ) : events.isError ? (
          <ErrorState error={events.error} onRetry={() => void events.refetch()} compact />
        ) : events.data.results.length === 0 ? (
          filter === "all" ? (
            <EmptyState
              icon={<CalendarPlus />}
              title="Create your first event"
              description="Tell people what's happening, when and where. An admin reviews it, then it goes live."
              action={
                <Button asChild variant="primary">
                  <Link to="/organiser/events/new">New event</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<CalendarRange />}
              title="Nothing here"
              description="None of your events have this status right now."
              action={<Button onClick={() => setFilter("all")}>Show all events</Button>}
            />
          )
        ) : (
          <ul className="space-y-3">
            {events.data.results.map((event) => (
              <li key={event.id}>
                <OrganiserEventRow event={event} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function OrganiserEventRow({ event }: { event: CommunityEvent }) {
  return (
    <article
      className={cn(
        "relative rounded-xl border bg-surface p-4 shadow-xs transition-colors hover:border-border-strong",
        event.status === "REJECTED" ? "border-danger/30" : "border-border",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 gap-3.5">
          <DateBlock iso={event.starts_at} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={event.status} explain />
              <span className="font-mono text-[11px] text-fg-subtle">{event.id}</span>
            </div>
            <h3 className="mt-1.5 truncate font-semibold">
              <Link to={`/events/${event.id}`} className="hover:underline hover:underline-offset-4">
                {event.title}
              </Link>
            </h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
              <span>{formatShortDateTime(event.starts_at)}</span>
              {event.location && (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{event.location}</span>
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:w-[300px] sm:shrink-0">
          <div className="min-w-0 flex-1">
            {event.status === "PUBLISHED" ? (
              <CapacityMeter event={event} />
            ) : (
              <p className="text-xs text-fg-subtle">
                {event.capacity} spots · registration opens when published
              </p>
            )}
          </div>
          <Button asChild size="sm">
            <Link to={`/organiser/events/${event.id}/edit`} aria-label={`Edit ${event.title}`}>
              <Pencil className="size-3.5" aria-hidden="true" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      {event.status === "REJECTED" && (
        <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-fg-muted">
          <span className="font-medium text-danger">Changes requested: </span>
          {event.review_note || "Update the event and resubmit it for review."}
        </p>
      )}
    </article>
  );
}
