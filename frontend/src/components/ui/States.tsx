import { CloudOff, RefreshCw, TriangleAlert, WifiOff } from "lucide-react";
import type { ReactNode } from "react";

import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { requestIdOf, toFriendlyError } from "@/lib/errors";

import { Button } from "./Button";

export function EmptyState({
  icon,
  title,
  description,
  action,
  plain,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  /** No border, for use inside an existing card. */
  plain?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl px-6 py-12 text-center",
        !plain && "border border-dashed border-border-strong bg-surface/60",
      )}
    >
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-accent-soft text-accent-text [&>svg]:size-6">
        {icon}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Page- or section-level error with friendly copy, a retry button and the request id for support. */
export function ErrorState({
  error,
  onRetry,
  compact,
  plain,
}: {
  error: unknown;
  onRetry?: () => void;
  compact?: boolean;
  /** No border or shadow, for use inside an existing card. */
  plain?: boolean;
}) {
  const friendly = toFriendlyError(error);
  const requestId = requestIdOf(error);
  const code = error instanceof ApiError ? error.code : undefined;
  const Icon = code === "NETWORK_ERROR" ? WifiOff : code === "SERVICE_UNAVAILABLE" ? CloudOff : TriangleAlert;

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center rounded-xl text-center",
        !plain && "border border-border bg-surface shadow-card",
        compact ? "px-5 py-8" : "px-6 py-14",
      )}
    >
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold">{friendly.title}</h3>
      <p className="mt-1 max-w-md text-sm text-fg-muted">{friendly.message}</p>
      {onRetry && (
        <Button className="mt-5" onClick={onRetry}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Try again
        </Button>
      )}
      {requestId && (
        <p className="mt-4 text-xs text-fg-subtle">
          Reference <span className="font-mono">{requestId}</span>
        </p>
      )}
    </div>
  );
}

/** An inline message inside a card or form. */
export function Callout({
  tone = "accent",
  icon,
  title,
  children,
  className,
}: {
  tone?: "accent" | "warning" | "danger" | "success";
  icon?: ReactNode;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const tones = {
    accent: "bg-accent-soft/70 border-accent/20 [&_.callout-icon]:text-accent-text",
    warning: "bg-warning-soft border-warning/25 [&_.callout-icon]:text-warning",
    danger: "bg-danger-soft border-danger/25 [&_.callout-icon]:text-danger",
    success: "bg-success-soft border-success/25 [&_.callout-icon]:text-success",
  };
  return (
    <div className={cn("flex gap-3 rounded-lg border p-3.5 text-sm", tones[tone], className)}>
      {icon && <span className="callout-icon mt-px shrink-0 [&>svg]:size-[18px]">{icon}</span>}
      <div className="min-w-0">
        {title && <p className="font-medium text-fg">{title}</p>}
        {children && <div className={cn("text-fg-muted", title && "mt-0.5")}>{children}</div>}
      </div>
    </div>
  );
}
