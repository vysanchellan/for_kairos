import { Tooltip as T } from "radix-ui";
import type { ReactNode } from "react";

export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <T.Root delayDuration={200}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          collisionPadding={12}
          className="z-50 max-w-64 rounded-md bg-fg px-2.5 py-1.5 text-xs leading-relaxed text-canvas shadow-pop"
        >
          {content}
          <T.Arrow className="fill-fg" />
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
