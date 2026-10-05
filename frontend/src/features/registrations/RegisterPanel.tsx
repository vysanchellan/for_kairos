import { Check, Copy, Lock, PartyPopper, Ticket } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Link } from "react-router";

import { CountUp } from "@/components/motion/primitives";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/States";
import { coverFor } from "@/features/events/covers";
import { useRegister } from "@/features/events/queries";
import type { CommunityEvent, RegistrationResult } from "@/lib/api/types";
import { toFriendlyError } from "@/lib/errors";
import { formatShortDateTime } from "@/lib/format";

/** The visitor's call to action: register, then celebrate and show the reference. */
export function RegisterPanel({ event }: { event: CommunityEvent }) {
  const register = useRegister(event.id);
  const [receipt, setReceipt] = useState<RegistrationResult | null>(null);
  // Captured once on mount (a lazy initializer keeps render pure); the server re-checks anyway.
  const [now] = useState(() => Date.now());
  const started = new Date(event.starts_at).getTime() <= now;

  if (receipt) {
    return <Confirmation event={event} receipt={receipt} onAgain={() => setReceipt(null)} />;
  }

  if (started) {
    return (
      <Callout tone="warning" icon={<Lock />} title="Registration has closed">
        This event has already started.
      </Callout>
    );
  }

  if (event.is_full) {
    return (
      <div className="space-y-3">
        <Callout tone="warning" icon={<Lock />} title="This event is full">
          Every spot has been taken.
        </Callout>
        <Button asChild className="w-full">
          <Link to="/">Find another event</Link>
        </Button>
      </div>
    );
  }

  const error = register.isError ? toFriendlyError(register.error) : null;

  return (
    <div className="space-y-3">
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        loading={register.isPending}
        onClick={() =>
          register.mutate(undefined, {
            onSuccess: (result) => setReceipt(result),
          })
        }
      >
        <Ticket className="size-[18px]" aria-hidden="true" />
        {register.isPending ? "Saving your spot…" : "Register interest"}
      </Button>
      <p className="text-center text-xs leading-relaxed text-fg-subtle">
        Anonymous. We only store a reference number and the time. No name, email or tracking.
      </p>
      <div aria-live="assertive">
        {error && (
          <Callout tone="danger" title={error.title}>
            {error.message}
          </Callout>
        )}
      </div>
    </div>
  );
}

function Confirmation({
  event,
  receipt,
  onAgain,
}: {
  event: CommunityEvent;
  receipt: RegistrationResult;
  onAgain: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const cover = coverFor(event);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(receipt.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the reference is still visible to copy by hand */
    }
  };

  return (
    <div className="relative" role="status" aria-live="polite">
      <Confetti />
      <motion.div
        initial={{ opacity: 0, y: 24, rotate: -2, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-lift"
      >
        {/* Ticket header: the event photo */}
        <div className="relative h-24 overflow-hidden">
          <img src={cover.small} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/90 via-emerald-800/70 to-emerald-700/30" />
          <div className="absolute inset-0 flex items-center gap-3 px-4 text-white">
            <motion.span
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 14, delay: 0.15 }}
              className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-emerald-700 shadow-lg"
            >
              <Check className="size-5" strokeWidth={3} aria-hidden="true" />
            </motion.span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-semibold">
                You're on the list <PartyPopper className="size-4" aria-hidden="true" />
              </p>
              <p className="truncate text-xs text-white/80">{event.title}</p>
            </div>
          </div>
        </div>

        {/* Perforation */}
        <div className="relative h-0 border-t-2 border-dashed border-border" aria-hidden="true">
          <span className="absolute -left-3 -top-3 size-6 rounded-full border border-border bg-surface" />
          <span className="absolute -right-3 -top-3 size-6 rounded-full border border-border bg-surface" />
        </div>

        <div className="p-4">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">Your reference</p>
              <p className="mt-0.5 font-mono text-lg font-semibold tracking-wide">{receipt.id}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => void copy()} aria-label="Copy reference">
              <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                  <motion.span key="ok" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5">
                    <Check className="size-4 text-success" aria-hidden="true" /> Copied
                  </motion.span>
                ) : (
                  <motion.span key="copy" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5">
                    <Copy className="size-4" aria-hidden="true" /> Copy
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-surface-muted px-3 py-2">
              <dt className="text-fg-subtle">When</dt>
              <dd className="mt-0.5 font-medium">{formatShortDateTime(event.starts_at)}</dd>
            </div>
            <div className="rounded-lg bg-surface-muted px-3 py-2">
              <dt className="text-fg-subtle">Spots left</dt>
              <dd className="mt-0.5 font-medium">
                {receipt.spots_remaining === 0 ? "You got the last one!" : <CountUp value={receipt.spots_remaining} />}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-fg-subtle">
            We don't know who you are, so keep this reference if you'd like to mention it on the day.
          </p>
          <button
            type="button"
            onClick={onAgain}
            className="mt-2 text-sm font-medium text-accent-text underline-offset-4 hover:underline"
          >
            Registering for someone else too?
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const CONFETTI_COLOURS = ["#6366f1", "#a855f7", "#ec4899", "#f59e0b", "#10b981", "#38bdf8"];

/** A one-off confetti burst that arcs up and falls. Not rendered under reduced motion. */
function Confetti() {
  const reduced = useReducedMotion();
  // Random once per burst (a lazy initializer keeps render pure).
  const [pieces] = useState(() =>
    Array.from({ length: 42 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 340,
      peak: -(80 + Math.random() * 140),
      fall: 160 + Math.random() * 120,
      rotate: (Math.random() - 0.5) * 720,
      size: 5 + Math.random() * 5,
      round: Math.random() > 0.6,
      colour: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
      delay: Math.random() * 0.15,
    })),
  );
  if (reduced) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-10 z-30" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute block"
          style={{
            width: p.size,
            height: p.round ? p.size : p.size * 0.45,
            borderRadius: p.round ? 999 : 2,
            backgroundColor: p.colour,
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: [0, p.x * 0.7, p.x], y: [0, p.peak, p.fall], opacity: [1, 1, 0], rotate: p.rotate }}
          transition={{ duration: 1.7, delay: p.delay, ease: [0.2, 0.7, 0.4, 1], times: [0, 0.35, 1] }}
        />
      ))}
    </div>
  );
}
