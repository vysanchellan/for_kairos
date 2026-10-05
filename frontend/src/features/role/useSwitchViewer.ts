import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router";

import { toast } from "@/components/ui/toast-store";
import { api, queryKeys } from "@/lib/api/endpoints";
import type { Organiser } from "@/lib/api/types";

import { ROLE_META, type Viewer } from "./roles";
import { useViewer } from "./viewer-context";

/** The seeded demo organisers. Fetched once; they never change at runtime. */
export function useOrganisers() {
  return useQuery({
    queryKey: queryKeys.organisers(),
    queryFn: ({ signal }) => api.listOrganisers(signal),
    staleTime: Infinity,
  });
}

export function organiserName(organisers: Organiser[] | undefined, id: string | null): string {
  return organisers?.find((o) => o.id === id)?.name ?? id ?? "";
}

/**
 * Switch the demo role. You stay on an event page (handy for "is it visible to
 * visitors now?"); anywhere else you land on the new role's home.
 */
export function useSwitchViewer() {
  const { viewer, setViewer } = useViewer();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: organisers } = useOrganisers();

  return useCallback(
    (next: Viewer) => {
      if (next.role === viewer.role && next.organiserId === viewer.organiserId) return;
      setViewer(next);
      if (!location.pathname.startsWith("/events/")) {
        navigate(ROLE_META[next.role].home);
      }
      const who =
        next.role === "organiser" ? organiserName(organisers, next.organiserId) : ROLE_META[next.role].label;
      toast({ tone: "info", title: `Now viewing as ${who}`, description: ROLE_META[next.role].summary });
    },
    [viewer, setViewer, navigate, location.pathname, organisers],
  );
}
