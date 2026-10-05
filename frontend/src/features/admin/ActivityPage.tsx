import { Activity } from "lucide-react";
import { ToggleGroup } from "radix-ui";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingRegion } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { RoleGate } from "@/features/role/RoleGate";
import type { ActivityKind } from "@/lib/api/types";
import { pluralise } from "@/lib/format";

import { KIND_META } from "./activity-kinds";
import { ActivityList, ActivitySkeleton } from "./ActivityFeed";
import { useActivity } from "./queries";

export default function ActivityPageRoute() {
  return (
    <RoleGate role="admin">
      <ActivityPage />
    </RoleGate>
  );
}

function ActivityPage() {
  const [kind, setKind] = useState<ActivityKind | "all">("all");
  const activity = useActivity(kind === "all" ? undefined : kind);
  const entries = activity.data?.pages.flatMap((p) => p.results) ?? [];
  const total = activity.data?.pages[0]?.count;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Activity"
        description="Everything that's happened, newest first: submissions, publishing and registrations."
      />

      <ToggleGroup.Root
        type="single"
        value={kind}
        onValueChange={(v) => v && setKind(v as ActivityKind | "all")}
        aria-label="Filter activity"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {[["all", "Everything"] as const, ...Object.entries(KIND_META).map(([k, m]) => [k, m.label] as const)].map(
          ([value, label]) => (
            <ToggleGroup.Item
              key={value}
              value={value}
              className="h-11 shrink-0 whitespace-nowrap rounded-full border border-border bg-surface px-4 text-sm font-medium text-fg-muted transition-colors hover:text-fg data-[state=on]:border-fg data-[state=on]:bg-fg data-[state=on]:text-canvas sm:h-9"
            >
              {label}
            </ToggleGroup.Item>
          ),
        )}
      </ToggleGroup.Root>

      <section className="rounded-xl border border-border bg-surface p-5 shadow-card sm:p-6" aria-label="Activity feed">
        {total !== undefined && <p className="mb-5 text-sm text-fg-subtle">{pluralise(total, "entry", "entries")}</p>}
        {activity.isPending ? (
          <LoadingRegion label="Loading activity">
            <ActivitySkeleton rows={8} />
          </LoadingRegion>
        ) : activity.isError ? (
          <ErrorState error={activity.error} onRetry={() => void activity.refetch()} compact plain />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<Activity />}
            title="Nothing here yet"
            description="When events are published or people register, it'll show up here."
            plain
          />
        ) : (
          <>
            <ActivityList entries={entries} />
            {activity.hasNextPage && (
              <div className="mt-6 flex justify-center">
                <Button loading={activity.isFetchingNextPage} onClick={() => void activity.fetchNextPage()}>
                  Load older activity
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
