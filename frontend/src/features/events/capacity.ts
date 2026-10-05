import type { CommunityEvent } from "@/lib/api/types";

export type CapacityState = "open" | "low" | "full";

export function capacityState(event: Pick<CommunityEvent, "capacity" | "spots_remaining">): CapacityState {
  if (event.spots_remaining <= 0) return "full";
  // "Low" = the last 20% of spots, or 5 or fewer, whichever is larger.
  if (event.spots_remaining <= Math.max(5, Math.ceil(event.capacity * 0.2))) return "low";
  return "open";
}

export function capacityLabel(event: Pick<CommunityEvent, "capacity" | "spots_remaining">): string {
  const state = capacityState(event);
  if (state === "full") return "Full";
  const n = event.spots_remaining;
  if (state === "low") return n === 1 ? "Only 1 spot left" : `Only ${n} spots left`;
  return `${n} spots left`;
}
