import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { useViewer } from "@/features/role/viewer-context";
import { api, queryKeys } from "@/lib/api/endpoints";
import type { ActivityKind, EventStatus } from "@/lib/api/types";

export function useAdminEvents(status?: EventStatus) {
  const { viewer } = useViewer();
  return useQuery({
    queryKey: queryKeys.adminEvents(status),
    queryFn: ({ signal }) => api.listAdminEvents(status, 1, signal),
    enabled: viewer.role === "admin",
  });
}

export function useAdminStats() {
  const { viewer } = useViewer();
  return useQuery({
    queryKey: queryKeys.adminStats(),
    queryFn: ({ signal }) => api.adminStats(signal),
    enabled: viewer.role === "admin",
  });
}

export function useActivity(kind?: ActivityKind) {
  const { viewer } = useViewer();
  return useInfiniteQuery({
    queryKey: queryKeys.activity(kind),
    queryFn: ({ pageParam, signal }) => api.listActivity(kind, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.total_pages ? last.page + 1 : undefined),
    enabled: viewer.role === "admin",
    refetchInterval: 15_000, // a gently live feed
  });
}
