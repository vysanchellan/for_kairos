import { createContext, useContext } from "react";

import type { Viewer } from "./roles";

export interface ViewerContextValue {
  viewer: Viewer;
  /** Stable key for caches that depend on who's asking. */
  viewerKey: string;
  setViewer: (next: Viewer) => void;
  introOpen: boolean;
  setIntroOpen: (open: boolean) => void;
}

export const ViewerContext = createContext<ViewerContextValue | null>(null);

export function useViewer(): ViewerContextValue {
  const context = useContext(ViewerContext);
  if (!context) throw new Error("useViewer must be used inside ViewerProvider");
  return context;
}
