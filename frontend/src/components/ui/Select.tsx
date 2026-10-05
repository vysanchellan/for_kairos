import { Check, ChevronDown } from "lucide-react";
import { Select as S } from "radix-ui";
import { forwardRef } from "react";

import { cn } from "@/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
}

/** An accessible select built on Radix (keyboard, typeahead and screen-reader support included). */
export const Select = forwardRef<
  HTMLButtonElement,
  {
    id: string;
    value: string;
    onValueChange: (value: string) => void;
    options: SelectOption[];
    invalid?: boolean;
    placeholder?: string;
    "aria-describedby"?: string;
    onBlur?: () => void;
  }
>(function Select({ id, value, onValueChange, options, invalid, placeholder, onBlur, ...aria }, ref) {
  return (
    <S.Root value={value} onValueChange={onValueChange}>
      <S.Trigger
        ref={ref}
        id={id}
        onBlur={onBlur}
        aria-invalid={invalid || undefined}
        aria-describedby={aria["aria-describedby"]}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-md border bg-surface px-3 text-left text-[15px] shadow-xs transition-colors sm:text-sm",
          "hover:border-border-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20 data-[placeholder]:text-fg-subtle",
          invalid ? "border-danger" : "border-border",
        )}
      >
        <S.Value placeholder={placeholder} />
        <S.Icon>
          <ChevronDown className="size-4 text-fg-subtle" aria-hidden="true" />
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-pop data-[state=open]:animate-[pop-in_150ms_ease-out]"
        >
          <S.Viewport>
            {options.map((option) => (
              <S.Item
                key={option.value}
                value={option.value}
                className="relative flex h-10 cursor-default select-none items-center rounded-md pl-8 pr-3 text-sm outline-none data-[highlighted]:bg-accent-soft data-[highlighted]:text-accent-text"
              >
                <S.ItemIndicator className="absolute left-2.5">
                  <Check className="size-4" aria-hidden="true" />
                </S.ItemIndicator>
                <S.ItemText>{option.label}</S.ItemText>
              </S.Item>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
});
