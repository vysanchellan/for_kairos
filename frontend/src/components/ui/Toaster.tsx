import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { Toast } from "radix-ui";
import { Link } from "react-router";

import { cn } from "@/lib/cn";

import { dismissToast, useToasts, type ToastTone } from "./toast-store";

const icons: Record<ToastTone, typeof Info> = { success: CircleCheck, info: Info, error: CircleAlert };
const iconTone: Record<ToastTone, string> = {
  success: "text-success",
  info: "text-accent-text",
  error: "text-danger",
};

/** Radix Toast renders into an aria-live region, so screen readers announce each toast. */
export function Toaster() {
  const toasts = useToasts();
  return (
    <Toast.Provider swipeDirection="right" duration={6000}>
      {toasts.map((item) => {
        const Icon = icons[item.tone];
        return (
          <Toast.Root
            key={item.id}
            type={item.tone === "error" ? "foreground" : "background"}
            onOpenChange={(open) => !open && dismissToast(item.id)}
            className={cn(
              "group pointer-events-auto relative flex w-full items-start gap-3 rounded-xl border border-border bg-surface p-4 pr-10 shadow-pop",
              "data-[state=open]:animate-[toast-in_220ms_cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:animate-[toast-out_150ms_ease-in]",
              "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=end]:animate-[toast-out_150ms_ease-in]",
            )}
          >
            <Icon className={cn("mt-0.5 size-5 shrink-0", iconTone[item.tone])} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <Toast.Title className="text-sm font-semibold">{item.title}</Toast.Title>
              {item.description && (
                <Toast.Description className="mt-0.5 text-sm text-fg-muted">{item.description}</Toast.Description>
              )}
              {item.action && (
                <Toast.Action altText={item.action.label} asChild>
                  <Link
                    to={item.action.to}
                    className="mt-2 inline-flex text-sm font-medium text-accent-text underline-offset-4 hover:underline"
                  >
                    {item.action.label} →
                  </Link>
                </Toast.Action>
              )}
            </div>
            <Toast.Close
              aria-label="Dismiss notification"
              className="absolute right-2 top-2 grid size-8 place-items-center rounded-md text-fg-subtle hover:bg-surface-muted hover:text-fg"
            >
              <X className="size-4" aria-hidden="true" />
            </Toast.Close>
          </Toast.Root>
        );
      })}
      <Toast.Viewport className="fixed bottom-0 right-0 z-[60] flex w-full max-w-sm flex-col gap-2 p-4 outline-none sm:bottom-2 sm:right-2" />
    </Toast.Provider>
  );
}
