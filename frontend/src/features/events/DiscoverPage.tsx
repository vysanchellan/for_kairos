import { CalendarSearch, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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
import { ease } from "@/lib/motion";

import { DiscoverHero } from "./components/DiscoverHero";
import { EventCard, EventCardSkeleton } from "./components/EventCard";
import { HowItWorks } from "./components/HowItWorks";
import { UpcomingMarquee } from "./components/UpcomingMarquee";
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
  // Unfiltered upcoming events for the marquee (same cache entry as the default list).
  const upcoming = usePublicEvents({ upcoming: true });

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
      <DiscoverHero />
      {upcoming.data && <UpcomingMarquee events={upcoming.data.pages[0]?.results ?? []} />}

      <section id="events" aria-labelledby="events-heading" className="scroll-mt-24">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="events-heading" className="text-xl font-semibold tracking-tight">
            Browse events
          </h2>
          <p className="text-sm text-fg-subtle" aria-live="polite">
            {query.isSuccess && (query.isPlaceholderData ? "Updating…" : pluralise(total, "event"))}
          </p>
        </div>

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
                  "relative h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors sm:h-9",
                  "border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg",
                  "data-[state=on]:border-transparent data-[state=on]:text-canvas",
                )}
              >
                {(filters.category ?? "all") === category.value && (
                  <motion.span
                    layoutId="category-pill"
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-fg"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative">{category.label}</span>
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
                "grid gap-5 transition-opacity sm:grid-cols-2 lg:grid-cols-3",
                query.isPlaceholderData && "opacity-60",
              )}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {events.map((event, i) => (
                  <motion.li
                    key={event.id}
                    layout
                    initial={{ opacity: 0, y: 28, scale: 0.97 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 } }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.55, ease, delay: (i % 3) * 0.08 }}
                  >
                    <EventCard event={event} />
                  </motion.li>
                ))}
              </AnimatePresence>
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

      <HowItWorks />
    </div>
  );
}
