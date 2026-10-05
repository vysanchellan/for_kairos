import { Check, Copy, Lock, PartyPopper, Ticket } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Link } from "react-router";

import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/States";
import { useRegister } from "@/features/events/queries";
import type { CommunityEvent, RegistrationResult } from "@/lib/api/types";
import { toFriendlyError } from "@/lib/errors";
import { ease } from "@/lib/motion";

/** The visitor's call to action: register, then celebrate and show the reference. */
export function RegisterPanel({ event }: { event: CommunityEvent }) {
  const register = useRegister(event.id);
  const [receipt, setReceipt] = useState<RegistrationResult | null>(null);
  // Captured once on mount (a lazy initializer keeps render pure); the server re-checks anyway.
  const [now] = useState(() => Date.now());
  const started = new Date(event.starts_at).getTime() <= now;

  if (receipt) {
    return <Confirmation receipt={receipt} onAgain={() => setReceipt(null)} />;
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

function Confirmation({ receipt, onAgain }: { receipt: RegistrationResult; onAgain: () => void }) {
  const [copied, setCopied] = useState(false);

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
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease }}
      className="relative overflow-hidden rounded-xl border border-success/25 bg-success-soft p-5 text-center"
    >
      <Burst />
      <motion.div
        initial={{ scale: 0.4, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 16, delay: 0.05 }}
        className="relative mx-auto grid size-12 place-items-center rounded-full bg-success text-white dark:text-canvas"
      >
        <Check className="size-6" strokeWidth={3} aria-hidden="true" />
      </motion.div>
      <h3 className="relative mt-3 flex items-center justify-center gap-1.5 text-lg font-semibold">
        You're on the list <PartyPopper className="size-5 text-success" aria-hidden="true" />
      </h3>
      <p className="relative mt-1 text-sm text-fg-muted">
        Your interest is registered. {receipt.spots_remaining === 0
          ? "You took the very last spot!"
          : `${receipt.spots_remaining} ${receipt.spots_remaining === 1 ? "spot" : "spots"} still open.`}
      </p>

      <div className="relative mt-4 rounded-lg border border-border bg-surface p-3 text-left">
        <p className="text-xs text-fg-subtle">Your reference</p>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className="font-mono text-[15px] font-medium tracking-wide">{receipt.id}</span>
          <Button variant="ghost" size="sm" onClick={() => void copy()} aria-label="Copy reference">
            <AnimatePresence mode="wait" initial={false}>
              {copied ? (
                <motion.span key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5">
                  <Check className="size-4 text-success" aria-hidden="true" /> Copied
                </motion.span>
              ) : (
                <motion.span key="copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5">
                  <Copy className="size-4" aria-hidden="true" /> Copy
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </div>
      <p className="relative mt-3 text-xs leading-relaxed text-fg-subtle">
        We don't know who you are, so keep this reference if you'd like to mention it on the day.
      </p>
      <button
        type="button"
        onClick={onAgain}
        className="relative mt-3 text-sm font-medium text-accent-text underline-offset-4 hover:underline"
      >
        Registering for someone else too?
      </button>
    </motion.div>
  );
}

/** A small, one-off confetti burst. Transforms are disabled under reduced motion via MotionConfig. */
function Burst() {
  const dots = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2;
    return { x: Math.cos(angle) * 90, y: Math.sin(angle) * 60, hue: i % 3 };
  });
  const colours = ["bg-success", "bg-accent", "bg-warning"];
  return (
    <div className="pointer-events-none absolute left-1/2 top-11" aria-hidden="true">
      {dots.map((dot, i) => (
        <motion.span
          key={i}
          className={`absolute size-1.5 rounded-full ${colours[dot.hue]}`}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: dot.x, y: dot.y, opacity: 0, scale: 0.4 }}
          transition={{ duration: 0.9, ease, delay: 0.1 }}
        />
      ))}
    </div>
  );
}
