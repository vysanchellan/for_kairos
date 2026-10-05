import type { EventCategory } from "@/lib/api/types";

export const CATEGORIES: Array<{ value: EventCategory; label: string }> = [
  { value: "community", label: "Community" },
  { value: "arts", label: "Arts & culture" },
  { value: "tech", label: "Tech" },
  { value: "outdoors", label: "Outdoors" },
  { value: "food", label: "Food & drink" },
  { value: "wellbeing", label: "Wellbeing" },
  { value: "learning", label: "Learning" },
];
