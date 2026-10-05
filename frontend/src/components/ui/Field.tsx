import { CircleAlert } from "lucide-react";
import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/**
 * Label + control + hint + error, wired together with ids so screen readers
 * announce the hint and the error with the control (aria-describedby).
 */
export function Field({
  id,
  label,
  hint,
  error,
  optional,
  counter,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  counter?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
          {optional && <span className="ml-1.5 font-normal text-fg-subtle">Optional</span>}
        </label>
        {counter}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-sm text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-fg-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const control =
  "block w-full rounded-md border bg-surface px-3 text-[15px] text-fg shadow-xs transition-colors duration-150 placeholder:text-fg-subtle hover:border-border-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20 disabled:opacity-60 sm:text-sm";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...props }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(control, "h-11", invalid ? "border-danger focus:border-danger focus:ring-danger/20" : "border-border", className)}
        {...props}
      />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(control, "resize-y py-2.5 leading-relaxed", invalid ? "border-danger" : "border-border", className)}
      {...props}
    />
  );
});

export function CharCount({ value, max }: { value: number; max: number }) {
  const near = value > max * 0.9;
  return (
    <span className={cn("text-xs tabular-nums", value > max ? "text-danger" : near ? "text-warning" : "text-fg-subtle")}>
      {value}/{max}
    </span>
  );
}
