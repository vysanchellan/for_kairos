/** Publish and request-changes actions, shared by the review queue and the event page. */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Megaphone, MessageSquareWarning } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { CharCount, Field, Textarea } from "@/components/ui/Field";
import { toast } from "@/components/ui/toast-store";
import { patchCachedEvent } from "@/features/events/queries";
import { api } from "@/lib/api/endpoints";
import type { CommunityEvent, EventStatus, Paginated } from "@/lib/api/types";
import { toFriendlyError } from "@/lib/errors";

type Snapshot = Array<[readonly unknown[], Paginated<CommunityEvent> | undefined]>;

/**
 * Optimistic status change: the row updates the moment you confirm. If the
 * server says no, we roll back and explain why.
 */
function useStatusMutation(kind: "publish" | "reject") {
  const queryClient = useQueryClient();
  const target: EventStatus = kind === "publish" ? "PUBLISHED" : "REJECTED";

  return useMutation<CommunityEvent, Error, { event: CommunityEvent; note?: string }, { snapshot: Snapshot }>({
    mutationFn: ({ event, note }) =>
      kind === "publish" ? api.publishEvent(event.id) : api.rejectEvent(event.id, note ?? ""),
    onMutate: async ({ event }) => {
      await queryClient.cancelQueries({ queryKey: ["events", "admin"] });
      const snapshot = queryClient.getQueriesData<Paginated<CommunityEvent>>({ queryKey: ["events", "admin"] });
      queryClient.setQueriesData<Paginated<CommunityEvent>>({ queryKey: ["events", "admin"] }, (old) =>
        old ? { ...old, results: old.results.map((e) => (e.id === event.id ? { ...e, status: target } : e)) } : old,
      );
      patchCachedEvent(queryClient, event.id, { status: target });
      return { snapshot };
    },
    onError: (error, { event }, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
      const friendly = toFriendlyError(error);
      toast({ tone: "error", title: friendly.title, description: friendly.message });
      void queryClient.invalidateQueries({ queryKey: ["events", "detail", event.id] });
    },
    onSuccess: (updated) => {
      patchCachedEvent(queryClient, updated.id, updated);
      toast(
        kind === "publish"
          ? {
              title: `${updated.title} is live`,
              description: "It's now visible to everyone and open for registrations.",
              action: { label: "View event", to: `/events/${updated.id}` },
            }
          : {
              tone: "info",
              title: "Changes requested",
              description: `We've let the organiser know what to change in ${updated.title}.`,
            },
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
      void queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

interface ActionProps {
  event: CommunityEvent;
  size?: "sm" | "md";
  /** Where focus goes after the dialog closes (the row may vanish from a filtered list). */
  returnFocusTo?: string;
}

export function PublishButton({ event, size = "sm", returnFocusTo }: ActionProps) {
  const [open, setOpen] = useState(false);
  const publish = useStatusMutation("publish");
  return (
    <>
      <Button variant="primary" size={size} onClick={() => setOpen(true)} loading={publish.isPending}>
        <Megaphone className="size-4" aria-hidden="true" />
        Publish
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        icon={<Megaphone />}
        title={`Publish “${event.title}”?`}
        description={
          <>
            It'll appear on the public events page straight away and visitors can start registering.{" "}
            <span className="font-mono text-xs">{event.id}</span>
          </>
        }
        confirmLabel="Publish event"
        returnFocusTo={returnFocusTo}
        onConfirm={() => publish.mutate({ event })}
      />
    </>
  );
}

const NOTE_MAX = 280;

export function RequestChangesButton({ event, size = "sm", returnFocusTo }: ActionProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const reject = useStatusMutation("reject");
  return (
    <>
      <Button variant="secondary" size={size} onClick={() => setOpen(true)} loading={reject.isPending}>
        <MessageSquareWarning className="size-4" aria-hidden="true" />
        Request changes
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Request changes"
        returnFocusTo={returnFocusTo}
        description={`“${event.title}” goes back to its organiser. They can edit it and resubmit it for review.`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            reject.mutate({ event, note: note.trim() });
            setOpen(false);
            setNote("");
          }}
        >
          <Field
            id="review-note"
            label="What should change?"
            optional
            hint="Shown to the organiser as plain text."
            counter={<CharCount value={note.length} max={NOTE_MAX} />}
          >
            <Textarea
              id="review-note"
              value={note}
              maxLength={NOTE_MAX}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a venue and say who the session is for."
              rows={3}
            />
          </Field>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">
              Send back to organiser
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
