import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-sm font-medium text-accent-text">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-[15px] text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatTile({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
      <div className="flex items-center justify-between text-sm text-fg-muted">
        {label}
        <span className="text-fg-subtle [&>svg]:size-4" aria-hidden="true">
          {icon}
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-fg-subtle">{hint}</div>}
    </div>
  );
}
