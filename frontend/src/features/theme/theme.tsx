import { Laptop, Moon, Sun } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "gather.theme";
const media = () => window.matchMedia("(prefers-color-scheme: dark)");

function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
  } catch {
    /* storage unavailable (private mode): fall back to system */
  }
  return "system";
}

function apply(preference: ThemePreference) {
  const dark = preference === "dark" || (preference === "system" && media().matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

const ThemeContext = createContext<{ preference: ThemePreference; setPreference: (p: ThemePreference) => void } | null>(
  null,
);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);

  useEffect(() => {
    apply(preference);
    if (preference !== "system") return;
    // Follow the OS live while on "system".
    const query = media();
    const onChange = () => apply("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ preference, setPreference }), [preference, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
] as const;

export function ThemeMenu() {
  const { preference, setPreference } = useTheme();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Colour theme: ${preference}`}
        className="grid size-11 place-items-center rounded-md text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg sm:size-9"
      >
        <Sun className="size-[18px] dark:hidden" aria-hidden="true" />
        <Moon className="hidden size-[18px] dark:block" aria-hidden="true" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-40 rounded-lg border border-border bg-surface p-1 shadow-pop data-[state=open]:animate-[pop-in_150ms_ease-out]"
        >
          <DropdownMenu.Label className="px-2.5 py-1.5 text-xs font-medium text-fg-subtle">Theme</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={preference} onValueChange={(v) => setPreference(v as ThemePreference)}>
            {OPTIONS.map(({ value, label, icon: Icon }) => (
              <DropdownMenu.RadioItem
                key={value}
                value={value}
                className={cn(
                  "flex h-10 cursor-default items-center gap-2.5 rounded-md px-2.5 text-sm outline-none",
                  "data-[highlighted]:bg-surface-muted data-[state=checked]:font-medium data-[state=checked]:text-accent-text",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
