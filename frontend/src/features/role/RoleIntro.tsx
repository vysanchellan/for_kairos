import { ArrowRight, Info } from "lucide-react";
import { Dialog } from "radix-ui";

import type { Role } from "@/lib/api/types";

import { RoleAvatar } from "./RoleSwitcher";
import { useOrganisers, useSwitchViewer } from "./useSwitchViewer";
import { ROLE_META } from "./roles";
import { useViewer } from "./viewer-context";

/** Shown on the first visit (and from "How do roles work?"): explains the demo roles and lets you pick one. */
export function RoleIntro() {
  const { introOpen, setIntroOpen } = useViewer();
  const switchTo = useSwitchViewer();
  const { data: organisers } = useOrganisers();

  const choose = (role: Role) => {
    const organiserId = role === "organiser" ? (organisers?.[0]?.id ?? "organiser-1") : null;
    switchTo({ role, organiserId });
    setIntroOpen(false);
  };

  return (
    <Dialog.Root open={introOpen} onOpenChange={setIntroOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay backdrop-blur-[2px] data-[state=open]:animate-[fade-in_150ms_ease-out]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-pop focus:outline-none data-[state=open]:animate-[dialog-in_220ms_cubic-bezier(0.22,1,0.36,1)] sm:p-7">
          <p className="text-sm font-medium text-accent-text">Welcome to Gather</p>
          <Dialog.Title className="mt-1 text-xl font-semibold">One app, three points of view</Dialog.Title>
          <Dialog.Description className="mt-2 text-[15px] leading-relaxed text-fg-muted">
            This is a demo, so there's no sign-in. Pick who you'd like to be. You can switch any time from{" "}
            <span className="font-medium text-fg">Viewing as</span> in the top corner.
          </Dialog.Description>

          <ul className="mt-5 space-y-2">
            {(Object.keys(ROLE_META) as Role[]).map((role) => (
              <li key={role}>
                <button
                  type="button"
                  onClick={() => choose(role)}
                  className="group flex w-full items-center gap-3.5 rounded-xl border border-border p-3.5 text-left transition-colors hover:border-accent/40 hover:bg-accent-soft/40"
                >
                  <RoleAvatar role={role} className="size-10" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{ROLE_META[role].label}</span>
                    <span className="block text-sm text-fg-muted">{ROLE_META[role].summary}</span>
                  </span>
                  <ArrowRight
                    className="size-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent-text"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>

          <p className="mt-5 flex gap-2 text-xs leading-relaxed text-fg-subtle">
            <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            Roles are for demonstration only. The server checks every action against the role you pick, but roles
            aren't real accounts.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
