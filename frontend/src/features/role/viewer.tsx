/**
 * Who the user is "viewing as" (the demo role).
 *
 * The choice is kept in localStorage so it survives reloads, and it's pushed
 * synchronously into the API client so that the very next request carries the
 * right headers. The server enforces every rule; this only picks the headers.
 */

import { useCallback, useMemo, useState, type ReactNode } from "react";

import { setApiIdentity } from "@/lib/api/client";

import type { Viewer } from "./roles";
import { ViewerContext } from "./viewer-context";

const STORAGE_KEY = "gather.viewer";
const INTRO_KEY = "gather.intro-seen";
const DEFAULT: Viewer = { role: "visitor", organiserId: null };

function load(): Viewer {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Viewer | null;
    if (parsed && (parsed.role === "visitor" || parsed.role === "admin")) return { role: parsed.role, organiserId: null };
    if (parsed?.role === "organiser" && typeof parsed.organiserId === "string") return parsed;
  } catch {
    /* fall through */
  }
  return DEFAULT;
}

function introSeen(): boolean {
  try {
    return localStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return true;
  }
}

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewerState] = useState<Viewer>(() => {
    const initial = load();
    setApiIdentity(initial);
    return initial;
  });
  const [introOpen, setIntroOpenState] = useState(() => !introSeen());

  const setViewer = useCallback((next: Viewer) => {
    setApiIdentity(next);
    setViewerState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const setIntroOpen = useCallback((open: boolean) => {
    setIntroOpenState(open);
    if (!open) {
      try {
        localStorage.setItem(INTRO_KEY, "1");
      } catch {
        /* ignore */
      }
    }
  }, []);

  const value = useMemo(
    () => ({
      viewer,
      viewerKey: viewer.role === "organiser" ? `organiser:${viewer.organiserId}` : viewer.role,
      setViewer,
      introOpen,
      setIntroOpen,
    }),
    [viewer, setViewer, introOpen, setIntroOpen],
  );
  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}
