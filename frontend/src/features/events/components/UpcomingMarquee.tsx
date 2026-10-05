import { Sparkles } from "lucide-react";
import { Link } from "react-router";

import type { CommunityEvent } from "@/lib/api/types";
import { formatShortDateTime } from "@/lib/format";

import { coverFor } from "../covers";

/**
 * An endlessly scrolling strip of what's coming up. The list is rendered twice
 * and the track slides by exactly half its width, so the loop is seamless.
 * It pauses on hover/focus; under reduced motion it becomes a plain scroller.
 */
export function UpcomingMarquee({ events }: { events: CommunityEvent[] }) {
  if (events.length < 3) return null;
  const duration = `${Math.max(30, events.length * 6)}s`;

  const chips = (copy: boolean) =>
    events.map((event) => {
      const cover = coverFor(event);
      return (
        <li key={`${copy ? "b" : "a"}-${event.id}`} className="shrink-0">
          <Link
            to={`/events/${event.id}`}
            viewTransition
            tabIndex={copy ? -1 : undefined}
            className="flex h-12 items-center gap-2.5 rounded-full border border-border bg-surface py-1 pl-1 pr-4 text-sm shadow-xs transition-colors hover:border-accent/50 hover:bg-accent-soft/40"
          >
            <img src={cover.small} alt="" className="size-10 rounded-full object-cover" loading="lazy" decoding="async" />
            <span className="max-w-[14rem] truncate font-medium">{event.title}</span>
            <span className="whitespace-nowrap text-xs text-fg-subtle">{formatShortDateTime(event.starts_at)}</span>
          </Link>
        </li>
      );
    });

  return (
    <section aria-label="Coming up" className="group relative mb-6 flex items-center gap-3">
      <p className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold sm:flex">
        <Sparkles className="size-4 text-accent-text" aria-hidden="true" />
        Coming up
      </p>
      <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] motion-reduce:overflow-x-auto">
        <div
          className="flex w-max gap-3 py-1 animate-[marquee_var(--marquee-duration)_linear_infinite] group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none"
          style={{ "--marquee-duration": duration } as React.CSSProperties}
        >
          <ul className="flex gap-3">{chips(false)}</ul>
          <ul className="flex gap-3 motion-reduce:hidden" aria-hidden="true">
            {chips(true)}
          </ul>
        </div>
      </div>
    </section>
  );
}
