import { CalendarPlus, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Link, NavLink, Outlet, ScrollRestoration, useLocation, useNavigation } from "react-router";

import { Button } from "@/components/ui/Button";
import { Toaster } from "@/components/ui/Toaster";
import { RoleIntro } from "@/features/role/RoleIntro";
import { RoleSwitcher } from "@/features/role/RoleSwitcher";
import { useViewer } from "@/features/role/viewer-context";
import { ThemeMenu } from "@/features/theme/theme";
import type { Role } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";

const NAV: Record<Role, Array<{ to: string; label: string; end?: boolean }>> = {
  visitor: [{ to: "/", label: "Discover", end: true }],
  organiser: [
    { to: "/organiser", label: "My events", end: true },
    { to: "/", label: "Discover", end: true },
  ],
  admin: [
    { to: "/admin", label: "Review queue", end: true },
    { to: "/admin/activity", label: "Activity" },
    { to: "/", label: "Public site", end: true },
  ],
};

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 rounded-md" aria-label="Gather home">
      <span className="grid size-8 place-items-center rounded-lg bg-accent shadow-xs" aria-hidden="true">
        <svg viewBox="0 0 32 32" className="size-5">
          <circle cx="11" cy="16" r="5" fill="var(--accent-fg)" />
          <circle cx="21" cy="16" r="5" fill="var(--accent-fg)" fillOpacity=".6" />
        </svg>
      </span>
      <span className="text-[17px] font-semibold tracking-tight">gather</span>
    </Link>
  );
}

function NavItems({ role, className }: { role: Role; className?: string }) {
  return (
    <ul className={cn("flex items-center gap-1", className)}>
      {NAV[role].map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "inline-flex h-11 items-center rounded-md px-3 text-sm font-medium transition-colors sm:h-9",
                isActive ? "bg-surface-muted text-fg" : "text-fg-muted hover:bg-surface-muted/70 hover:text-fg",
              )
            }
          >
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function Layout() {
  const { viewer } = useViewer();
  const navigation = useNavigation();
  const location = useLocation();
  const online = useOnline();

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-[70] rounded-md bg-surface px-4 py-2 font-medium shadow-pop focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      {navigation.state === "loading" && (
        <div className="fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden" role="progressbar" aria-label="Loading page">
          <div className="h-full w-1/3 animate-[toast-in_600ms_ease-out_infinite_alternate] bg-accent" />
        </div>
      )}

      <header className="sticky top-0 z-30 border-b border-border/80 bg-canvas/85 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <div className="shrink-0"><Logo /></div>
          <nav aria-label="Main" className="ml-4 hidden md:block">
            <NavItems role={viewer.role} />
          </nav>
          <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
            {viewer.role === "organiser" && (
              <span className="hidden sm:block">
                <Button asChild variant="primary" size="sm">
                  <Link to="/organiser/events/new">
                    <CalendarPlus className="size-4" aria-hidden="true" />
                    New event
                  </Link>
                </Button>
              </span>
            )}
            <ThemeMenu />
            <RoleSwitcher />
          </div>
        </div>
        <nav aria-label="Main" className="border-t border-border/70 px-2 md:hidden">
          <NavItems role={viewer.role} className="overflow-x-auto py-1" />
        </nav>
      </header>

      {!online && (
        <div role="status" className="border-b border-warning/30 bg-warning-soft">
          <p className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-sm text-fg sm:px-6">
            <WifiOff className="size-4 text-warning" aria-hidden="true" />
            You're offline. We'll reconnect automatically when you're back.
          </p>
        </div>
      )}

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 focus:outline-none sm:px-6 sm:pt-8">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease }}
        >
          <Outlet />
        </motion.div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-xs text-fg-subtle sm:flex-row sm:justify-between sm:px-6">
          <p>Gather is a demo community events platform. All events and organisers are fictional.</p>
          <p>Registrations are anonymous: we store a reference and a timestamp, nothing about you.</p>
        </div>
      </footer>

      <RoleIntro />
      <Toaster />
      <ScrollRestoration />
    </div>
  );
}
