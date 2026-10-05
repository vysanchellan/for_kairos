import { Lock } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import type { Role } from "@/lib/api/types";

import { useOrganisers, useSwitchViewer } from "./useSwitchViewer";
import { ROLE_META } from "./roles";
import { useViewer } from "./viewer-context";

/**
 * Shows its children only to the given role. Anyone else gets a friendly
 * explanation and a one-click switch, never a dead end. (The API enforces the
 * same rule; this is about not showing actions a role can't perform.)
 */
export function RoleGate({ role, children }: { role: Role; children: ReactNode }) {
  const { viewer } = useViewer();
  const switchTo = useSwitchViewer();
  const { data: organisers } = useOrganisers();

  if (viewer.role === role) return <>{children}</>;

  const meta = ROLE_META[role];
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-accent-soft text-accent-text">
        <Lock className="size-5" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-semibold">This page is for {meta.label.toLowerCase()}s</h1>
      <p className="mt-2 text-fg-muted">
        You're viewing as {ROLE_META[viewer.role].label.toLowerCase()}. {meta.summary}
      </p>
      <Button
        variant="primary"
        className="mt-6"
        onClick={() =>
          switchTo({ role, organiserId: role === "organiser" ? (organisers?.[0]?.id ?? "organiser-1") : null })
        }
      >
        Switch to {meta.label}
      </Button>
    </div>
  );
}
