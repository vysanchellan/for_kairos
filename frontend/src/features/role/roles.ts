import { Compass, ShieldCheck, Store, type LucideIcon } from "lucide-react";

import type { Role } from "@/lib/api/types";

export interface Viewer {
  role: Role;
  organiserId: string | null;
}

export const ROLE_META: Record<Role, { label: string; summary: string; icon: LucideIcon; home: string }> = {
  visitor: {
    label: "Visitor",
    summary: "Browse published events and register interest anonymously.",
    icon: Compass,
    home: "/",
  },
  organiser: {
    label: "Organiser",
    summary: "Create events, track registrations and make edits.",
    icon: Store,
    home: "/organiser",
  },
  admin: {
    label: "Admin",
    summary: "Review submitted events and publish them to everyone.",
    icon: ShieldCheck,
    home: "/admin",
  },
};
