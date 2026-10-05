import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { patchCachedEvent } from "@/features/events/queries";
import { useViewer } from "@/features/role/viewer-context";
import { api, queryKeys } from "@/lib/api/endpoints";
import type { CommunityEvent, EventInput, EventStatus } from "@/lib/api/types";

export function useMyEvents(status?: EventStatus) {
  const { viewer } = useViewer();
  const organiserId = viewer.organiserId ?? "";
  return useQuery({
    queryKey: queryKeys.myEvents(organiserId, status),
    queryFn: ({ signal }) => api.listMyEvents(status, 1, signal),
    enabled: viewer.role === "organiser",
  });
}

export function useMyStats() {
  const { viewer } = useViewer();
  return useQuery({
    queryKey: queryKeys.myStats(viewer.organiserId ?? ""),
    queryFn: ({ signal }) => api.myStats(signal),
    enabled: viewer.role === "organiser",
  });
}

/** Create (no id) or update (id) an event. */
export function useSaveEvent(eventId?: string) {
  const queryClient = useQueryClient();
  return useMutation<CommunityEvent, Error, Partial<EventInput>>({
    mutationFn: (input) =>
      eventId ? api.updateEvent(eventId, input) : api.createEvent(input as EventInput),
    onSuccess: (saved) => {
      patchCachedEvent(queryClient, saved.id, saved);
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
      void queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}
