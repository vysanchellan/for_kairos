import { CalendarSearch, Search, ShieldCheck, X } from "lucide-react";
import { Switch, ToggleGroup } from "radix-ui";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import { Button } from "@/components/ui/Button";
import { LoadingRegion } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import type { PublicEventFilters } from "@/lib/api/endpoints";
import type { EventCategory } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { pluralise } from "@/lib/format";

import { EventCard, EventCardSkeleton } from "./components/EventCard";
import { CATEGORIES } from "./categories";
import { usePublicEvents } from "./queries";


/** Filters live in the URL, so a filtered view can be bookmarked and shared, and Back works. */
function useFilters() {
  const [params, setParams] = useSearchParams();
  const filters: PublicEventFilters = useMemo(
    () => ({
      category: (CATEGORIES.find((c) => c.value === params.get("category"))?.value ?? undefined) as
        | EventCategory
        | undefined,
      upcoming: params.get("upcoming") !== "0",
      q: params.get("q") ?? undefined,
    }),
    [params],
  );
  const update = (patch: Record<string, string | null>) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(patch)) {
          if (value === null || value === "") next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  return { filters, update };
}

export default function DiscoverPage() {
  const { filters, update } = useFilters();
  const [search, setSearch] = useState(filters.q ?? "");
  const query = usePublicEvents(filters);

  // Debounce typing into the URL (and therefore the API) by 300ms.
  useEffect(() => {
    const handle = setTimeout(() => {
      if ((filters.q ?? "") !== search.trim()) update({ q: search.trim() || null });
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const events = query.data?.pages.flatMap((page) => page.results) ?? [];
  const total = query.data?.pages[0]?.count ?? 0;
  const filtered = Boolean(filters.category || filters.q || !filters.upcoming);

  return (
    <div>
      <section className="relative mb-7 overflow-hidden rounded-2xl border border-border bg-surface px-5 py-7 shadow-card sm:px-8 sm:py-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-accent/10 blur-3xl"
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-accent-text">Community events near you</p>
            <h1 className="mt-2 text-[27px] font-semibold leading-tight tracking-tight sm:text-4xl">
              Find something good to do this week
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-fg-muted sm:text-base">
              Repair cafés, open mics, sunrise yoga and more, all run by local groups. Register your interest in one
              tap, with no account needed.
            </p>
          </div>
          <p className="inline-flex items-center gap-2 self-start rounded-full border border-success/25 bg-success-soft px-3 py-1.5 text-sm font-medium text-success lg:self-end">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Anonymous by design
          </p>
        </div>
      </section>

      <section aria-labelledby="events-heading">
        <h2 id="events-heading" className="sr-only">
          Events
        </h2>

        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <ToggleGroup.Root
            type="single"
            value={filters.category ?? "all"}
            onValueChange={(value) => update({ category: !value || value === "all" ? null : value })}
            aria-label="Filter by category"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:min-w-0 lg:flex-1 lg:flex-wrap lg:px-0 lg:pb-0"
          >
            {[{ value: "all", label: "All" }, ...CATEGORIES].map((category) => (
              <ToggleGroup.Item
                key={category.value}
                value={category.value}
                className={cn(
                  "h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors sm:h-9",
                  "border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg",
                  "data-[state=on]:border-fg data-[state=on]:bg-fg data-[state=on]:text-canvas",
                )}
              >
                {category.label}
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>

          <div className="flex items-center gap-3 lg:shrink-0">
            <div className="relative flex-1 lg:w-56 lg:flex-none">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
                aria-hidden="true"
              />
              <label htmlFor="event-search" className="sr-only">
                Search events by title
              </label>
              <input
                id="event-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events"
                className="h-11 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-[15px] shadow-xs placeholder:text-fg-subtle hover:border-border-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20 sm:h-9 sm:text-sm"
              />
            </div>
            <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-fg-muted">
              <Switch.Root
                checked={filters.upcoming}
                onCheckedChange={(checked) => update({ upcoming: checked ? null : "0" })}
                className="relative h-6 w-10 shrink-0 rounded-full bg-border-strong transition-colors data-[state=checked]:bg-accent"
              >
                <Switch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow-xs transition-transform duration-150 data-[state=checked]:translate-x-[18px]" />
              </Switch.Root>
              Upcoming only
            </label>
          </div>
        </div>

        <p className="mb-4 text-sm text-fg-subtle" aria-live="polite">
          {query.isSuccess && (query.isPlaceholderData ? "Updating…" : pluralise(total, "event"))}
        </p>

        {query.isPending ? (
          <LoadingRegion label="Loading events">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          </LoadingRegion>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : events.length === 0 ? (
          <EmptyState
            icon={<CalendarSearch />}
            title={filtered ? "No events match those filters" : "No events yet"}
            description={
              filtered
                ? "Try another category or clear the search to see everything that's coming up."
                : "New events appear here as soon as they're reviewed. Check back soon."
            }
            action={
              filtered && (
                <Button
                  onClick={() => {
                    setSearch("");
                    update({ category: null, q: null, upcoming: null });
                  }}
                >
                  <X className="size-4" aria-hidden="true" />
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          <>
            <ul
              className={cn(
                "grid gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3",
                query.isPlaceholderData && "opacity-60",
              )}
            >
              {events.map((event) => (
                <li key={event.id}>
                  <EventCard event={event} />
                </li>
              ))}
            </ul>
            {query.hasNextPage && (
              <div className="mt-8 flex justify-center">
                <Button loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
                  Show more events
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
