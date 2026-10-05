import { Slot } from "radix-ui";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-fg shadow-xs hover:bg-accent-hover disabled:hover:bg-accent",
  secondary:
    "bg-surface text-fg border border-border-strong/80 shadow-xs hover:bg-surface-muted hover:border-border-strong",
  ghost: "text-fg-muted hover:text-fg hover:bg-surface-muted",
  danger: "bg-danger text-white hover:brightness-110 dark:text-canvas",
  success: "bg-success text-white hover:brightness-110 dark:text-canvas",
};

// Every size keeps a 44px tap target on touch screens (WCAG 2.5.8 recommends at least 24px; 44px is comfortable).
const sizes: Record<Size, string> = {
  sm: "h-11 sm:h-9 px-3 text-sm gap-1.5 rounded-md",
  md: "h-11 px-4 text-sm gap-2 rounded-md",
  lg: "h-12 px-5 text-[15px] gap-2 rounded-lg",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Render the child element (e.g. a router Link) with button styling. */
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", asChild, loading, className, children, disabled, ...props },
  ref,
) {
  const Component = asChild ? Slot.Root : "button";
  return (
    <Component
      ref={ref}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium",
        "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out",
        "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...(asChild ? {} : { type: props.type ?? "button" })}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Spinner />}
          {children}
        </>
      )}
    </Component>
  );
});

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-4 animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
