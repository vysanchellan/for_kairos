import { Link } from "react-router";

import { Skeleton } from "@/components/ui/Skeleton";
import type { ActivityEntry } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/format";

import { KIND_META } from "./activity-kinds";

/** A vertical timeline of activity entries, newest first. */
export function ActivityList({ entries, compact = false }: { entries: ActivityEntry[]; compact?: boolean }) {
  return (
    <ol className="relative">
      {entries.map((entry, index) => {
        const meta = KIND_META[entry.kind];
        const Icon = meta.icon;
        const last = index === entries.length - 1;
        return (
          <li key={entry.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && <span className="absolute left-4 top-9 h-[calc(100%-2.25rem)] w-px bg-border" aria-hidden="true" />}
            <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", meta.tone)} aria-hidden="true">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className={cn("text-sm", compact && "line-clamp-2")}>
                <span className="font-medium">{entry.kind_label}</span>
                <span className="text-fg-muted"> · </span>
                <Link to={`/events/${entry.event.id}`} className="text-fg-muted underline-offset-4 hover:text-fg hover:underline">
                  {entry.event.title}
                </Link>
              </p>
              <p className="mt-0.5 text-xs text-fg-subtle">
                <time dateTime={entry.created_at} title={new Date(entry.created_at).toLocaleString()}>
                  {formatRelative(entry.created_at)}
                </time>
                {" · "}
                <span className="font-mono">{entry.registration_id || entry.event.id}</span>
                {!compact && <> · by {entry.actor}</>}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ActivitySkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-5" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
