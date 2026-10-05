import { Check, ChevronDown, CircleHelp } from "lucide-react";
import { DropdownMenu } from "radix-ui";

import type { Role } from "@/lib/api/types";
import { cn } from "@/lib/cn";

import { organiserName, useOrganisers, useSwitchViewer } from "./useSwitchViewer";
import { ROLE_META } from "./roles";
import { useViewer } from "./viewer-context";

const avatarTone: Record<Role, string> = {
  visitor: "bg-surface-muted text-fg-muted",
  organiser: "bg-success-soft text-success",
  admin: "bg-accent-soft text-accent-text",
};

export function RoleAvatar({ role, className }: { role: Role; className?: string }) {
  const Icon = ROLE_META[role].icon;
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-full", avatarTone[role], className ?? "size-7")}>
      <Icon className="size-[55%]" aria-hidden="true" />
    </span>
  );
}

const itemBase = "flex cursor-default gap-3 rounded-md px-2.5 text-sm outline-none data-[highlighted]:bg-surface-muted";
const item = `${itemBase} items-start py-2`;
const subItem = `${itemBase} ml-11 items-center py-1.5`;
const plainItem = `${itemBase} items-center py-2 text-fg-muted`;

/** The "Viewing as" control. It's first-class because the whole demo revolves around roles. */
export function RoleSwitcher() {
  const { viewer, setIntroOpen } = useViewer();
  const switchTo = useSwitchViewer();
  const { data: organisers } = useOrganisers();

  const name = viewer.role === "organiser" ? organiserName(organisers, viewer.organiserId) : ROLE_META[viewer.role].label;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="group flex h-11 min-w-0 max-w-[10.5rem] items-center gap-2 sm:max-w-[15rem] rounded-full border border-border bg-surface py-1 pl-1 pr-2.5 text-left shadow-xs transition-colors hover:border-border-strong sm:h-10"
        aria-label={`Viewing as ${name}. Change role`}
      >
        <RoleAvatar role={viewer.role} className="size-8" />
        <span className="min-w-0 leading-tight">
          <span className="block text-[11px] text-fg-subtle">Viewing as</span>
          <span className="block truncate text-sm font-medium">{name}</span>
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-fg-subtle transition-transform group-data-[state=open]:rotate-180"
          aria-hidden="true"
        />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-surface p-1.5 shadow-pop data-[state=open]:animate-[pop-in_150ms_ease-out]"
        >
          <DropdownMenu.Label className="px-2.5 pb-1 pt-1.5 text-xs font-medium text-fg-subtle">
            Switch demo role
          </DropdownMenu.Label>

          <DropdownMenu.Item className={item} onSelect={() => switchTo({ role: "visitor", organiserId: null })}>
            <RoleAvatar role="visitor" className="size-8" />
            <RoleText role="visitor" active={viewer.role === "visitor"} />
          </DropdownMenu.Item>

          <DropdownMenu.Group>
            <DropdownMenu.Label className="flex items-start gap-3 px-2.5 pt-2">
              <RoleAvatar role="organiser" className="size-8" />
              <span className="pt-0.5">
                <span className="block text-sm font-medium">Organiser</span>
                <span className="block text-xs text-fg-muted">{ROLE_META.organiser.summary}</span>
              </span>
            </DropdownMenu.Label>
            {(organisers ?? []).map((org) => {
              const active = viewer.role === "organiser" && viewer.organiserId === org.id;
              return (
                <DropdownMenu.Item
                  key={org.id}
                  className={subItem}
                  onSelect={() => switchTo({ role: "organiser", organiserId: org.id })}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{org.name}</span>
                    <span className="block font-mono text-[11px] text-fg-subtle">{org.id}</span>
                  </span>
                  {active && <Check className="size-4 text-accent-text" aria-label="Current" />}
                </DropdownMenu.Item>
              );
            })}
          </DropdownMenu.Group>

          <DropdownMenu.Item className={`${item} mt-1`} onSelect={() => switchTo({ role: "admin", organiserId: null })}>
            <RoleAvatar role="admin" className="size-8" />
            <RoleText role="admin" active={viewer.role === "admin"} />
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1.5 h-px bg-border" />
          <DropdownMenu.Item className={plainItem} onSelect={() => setIntroOpen(true)}>
            <CircleHelp className="ml-1.5 size-4" aria-hidden="true" />
            How do roles work?
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function RoleText({ role, active }: { role: Role; active: boolean }) {
  return (
    <>
      <span className="min-w-0 flex-1 pt-0.5">
        <span className="block font-medium">{ROLE_META[role].label}</span>
        <span className="block text-xs text-fg-muted">{ROLE_META[role].summary}</span>
      </span>
      {active && <Check className="mt-1 size-4 shrink-0 text-accent-text" aria-label="Current" />}
    </>
  );
}
