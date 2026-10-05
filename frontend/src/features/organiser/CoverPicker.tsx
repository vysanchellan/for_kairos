import { Check, Wand2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { COVER_KEYS, CATEGORY_DEFAULT_COVER, getCover, type CoverKey } from "@/features/events/covers";
import type { EventCategory } from "@/lib/api/types";
import { cn } from "@/lib/cn";

/**
 * Pick a cover photo from the bundled set. Built on native radio inputs, so
 * arrow keys, Tab and screen readers work without extra code. "" means
 * "use the category's default".
 */
export function CoverPicker({
  value,
  onChange,
  category,
}: {
  value: string;
  onChange: (value: string) => void;
  category: EventCategory;
}) {
  const options: Array<{ value: string; key: CoverKey; label: string; auto?: boolean }> = [
    { value: "", key: CATEGORY_DEFAULT_COVER[category], label: "Match the category", auto: true },
    ...COVER_KEYS.map((key) => ({ value: key, key, label: getCover(key).label })),
  ];

  return (
    <fieldset>
      <legend className="text-sm font-medium">Cover photo</legend>
      <p className="mt-0.5 text-sm text-fg-subtle">Shown on the event card and page.</p>
      <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {options.map((option) => {
          const cover = getCover(option.key);
          const selected = value === option.value;
          return (
            <label
              key={option.value || "auto"}
              className={cn(
                "group relative cursor-pointer overflow-hidden rounded-xl ring-offset-2 ring-offset-surface transition-shadow",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus",
                selected ? "ring-2 ring-accent" : "ring-1 ring-border hover:ring-border-strong",
              )}
            >
              <input
                type="radio"
                name="cover_image"
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <img
                src={cover.small}
                alt=""
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0" aria-hidden="true" />
              <span className="absolute bottom-1.5 left-2 right-2 flex items-center gap-1 truncate text-[11px] font-medium text-white">
                {option.auto && <Wand2 className="size-3 shrink-0" aria-hidden="true" />}
                {option.label}
              </span>
              <AnimatePresence>
                {selected && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 26 }}
                    className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-accent text-accent-fg shadow"
                    aria-hidden="true"
                  >
                    <Check className="size-3.5" strokeWidth={3} />
                  </motion.span>
                )}
              </AnimatePresence>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
