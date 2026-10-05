import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useViewer } from "@/features/role/viewer-context";
import { api, queryKeys, type PublicEventFilters } from "@/lib/api/endpoints";
import type { CommunityEvent, RegistrationResult } from "@/lib/api/types";

export function usePublicEvents(filters: PublicEventFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.publicEvents(filters),
    queryFn: ({ pageParam, signal }) => api.listPublicEvents(filters, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.total_pages ? last.page + 1 : undefined),
    placeholderData: (previous) => previous, // keep showing old results while a filter change loads
  });
}

export function useEvent(id: string) {
  const { viewerKey } = useViewer();
  return useQuery({
    queryKey: queryKeys.event(id, viewerKey),
    queryFn: ({ signal }) => api.getEvent(id, signal),
  });
}

/** Patch an event's numbers in every cached copy (each viewer has its own cache entry). */
export function patchCachedEvent(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
  patch: Partial<CommunityEvent> | ((event: CommunityEvent) => CommunityEvent),
) {
  queryClient.setQueriesData<CommunityEvent>({ queryKey: ["events", "detail", id] }, (old) =>
    old ? (typeof patch === "function" ? patch(old) : { ...old, ...patch }) : old,
  );
}

export function useRegister(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation<RegistrationResult, Error>({
    mutationFn: () => api.register(eventId),
    onSuccess: (result) => {
      // The server tells us the fresh counts, so update the page immediately...
      patchCachedEvent(queryClient, eventId, (event) => ({
        ...event,
        registered_count: result.registered_count,
        spots_remaining: result.spots_remaining,
        is_full: result.spots_remaining === 0,
      }));
      // ...and let lists and dashboards refetch in the background.
      void queryClient.invalidateQueries({ queryKey: ["events", "public"] });
      void queryClient.invalidateQueries({ queryKey: ["events", "mine"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
      void queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
    onError: () => {
      // e.g. EVENT_FULL: someone took the last spot, so refresh the real numbers.
      void queryClient.invalidateQueries({ queryKey: ["events", "detail", eventId] });
    },
  });
}
