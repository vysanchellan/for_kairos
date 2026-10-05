/**
 * Dialog wrappers on Radix primitives. Radix provides the focus trap, Escape to
 * close, scroll locking and aria wiring, so none of that is hand-rolled here.
 */

import { AlertDialog, Dialog as D } from "radix-ui";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Button } from "./Button";

const overlay =
  "fixed inset-0 z-40 bg-overlay backdrop-blur-[2px] data-[state=open]:animate-[fade-in_150ms_ease-out]";
const panel =
  "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-6 shadow-pop focus:outline-none data-[state=open]:animate-[dialog-in_200ms_cubic-bezier(0.22,1,0.36,1)]";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  tone = "primary",
  icon,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  tone?: "primary" | "danger" | "success";
  icon?: ReactNode;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={overlay} />
        <AlertDialog.Content className={panel}>
          {icon && (
            <div className="mb-4 grid size-11 place-items-center rounded-full bg-accent-soft text-accent-text [&>svg]:size-5">
              {icon}
            </div>
          )}
          <AlertDialog.Title className="text-lg font-semibold">{title}</AlertDialog.Title>
          <AlertDialog.Description asChild>
            <div className="mt-2 text-sm leading-relaxed text-fg-muted">{description}</div>
          </AlertDialog.Description>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary">{cancelLabel}</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant={tone} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className={overlay} />
        <D.Content className={cn(panel, className)}>
          <D.Title className="text-lg font-semibold">{title}</D.Title>
          {description ? (
            <D.Description className="mt-1.5 text-sm leading-relaxed text-fg-muted">{description}</D.Description>
          ) : (
            <D.Description className="sr-only">{title}</D.Description>
          )}
          <div className="mt-5">{children}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
