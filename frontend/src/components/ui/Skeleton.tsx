import { cn } from "@/lib/cn";

/** A placeholder block. Loading layouts mirror the final layout so nothing jumps. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-skeleton rounded-md bg-surface-muted", className)} aria-hidden="true" />;
}

/** Wrap a skeleton layout so screen readers hear "Loading" once, not a pile of empty boxes. */
export function LoadingRegion({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
