import { ArrowLeft, CircleAlert, Eye, Info, SearchX, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Link, useBlocker, useNavigate, useParams } from "react-router";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { CharCount, Field, Input, Textarea } from "@/components/ui/Field";
import { describedBy } from "@/components/ui/field-utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";
import { Callout, EmptyState, ErrorState } from "@/components/ui/States";
import { toast } from "@/components/ui/toast-store";
import { CATEGORIES } from "@/features/events/categories";
import { EventCard } from "@/features/events/components/EventCard";
import { useEvent } from "@/features/events/queries";
import { RoleGate } from "@/features/role/RoleGate";
import { organiserName, useOrganisers } from "@/features/role/useSwitchViewer";
import { useViewer } from "@/features/role/viewer-context";
import { ApiError } from "@/lib/api/client";
import type { CommunityEvent, EventCategory, EventInput } from "@/lib/api/types";
import { toFriendlyError } from "@/lib/errors";
import { fromLocalInputValue, timeZoneLabel, toLocalInputValue, userTimeZone } from "@/lib/format";

import { useSaveEvent } from "./queries";

const LIMITS = { title: 120, description: 2000, location: 120, capacity: 10_000 } as const;

interface FormValues {
  title: string;
  description: string;
  category: EventCategory;
  location: string;
  startsAt: string; // datetime-local value, in the viewer's local time
  capacity: number;
}

/** API field name -> form field name (the only one that differs is the date). */
const FIELD_MAP: Record<string, keyof FormValues> = {
  title: "title",
  description: "description",
  category: "category",
  location: "location",
  starts_at: "startsAt",
  capacity: "capacity",
};

export default function EventEditorPage() {
  return (
    <RoleGate role="organiser">
      <EditorLoader />
    </RoleGate>
  );
}

function EditorLoader() {
  const { eventId } = useParams();
  if (!eventId) return <EventEditor />;
  return <EditExisting eventId={eventId} />;
}

function EditExisting({ eventId }: { eventId: string }) {
  const query = useEvent(eventId);
  const { viewer } = useViewer();

  if (query.isPending) {
    return (
      <LoadingRegion label="Loading event">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-8 h-[520px] w-full max-w-2xl rounded-xl" />
      </LoadingRegion>
    );
  }
  if (query.isError) {
    return query.error instanceof ApiError && query.error.code === "EVENT_NOT_FOUND" ? (
      <EmptyState
        icon={<SearchX />}
        title="We couldn't find that event"
        description="It may not exist, or it may belong to another organiser."
        action={
          <Button asChild>
            <Link to="/organiser">Back to your events</Link>
          </Button>
        }
      />
    ) : (
      <ErrorState error={query.error} onRetry={() => void query.refetch()} />
    );
  }
  if (query.data.organiser.id !== viewer.organiserId) {
    return (
      <EmptyState
        icon={<CircleAlert />}
        title="This isn't one of your events"
        description="You can only edit events you organise. Switch to its organiser to make changes."
        action={
          <Button asChild>
            <Link to={`/events/${query.data.id}`}>View event</Link>
          </Button>
        }
      />
    );
  }
  return <EventEditor event={query.data} />;
}

/** Module-level so it isn't treated as render logic: it runs only when the field is validated. */
function validateStartsAt(value: string, original?: string): true | string {
  if (!value) return "Choose when the event starts.";
  const unchanged = original !== undefined && value === toLocalInputValue(original);
  if (!unchanged && new Date(value).getTime() <= Date.now()) return "Pick a date and time in the future.";
  return true;
}

function defaultsFrom(event?: CommunityEvent): FormValues {
  return {
    title: event?.title ?? "",
    description: event?.description ?? "",
    category: event?.category ?? "community",
    location: event?.location ?? "",
    startsAt: event ? toLocalInputValue(event.starts_at) : "",
    capacity: event?.capacity ?? Number.NaN,
  };
}

function EventEditor({ event }: { event?: CommunityEvent }) {
  const isEdit = Boolean(event);
  const navigate = useNavigate();
  const save = useSaveEvent(event?.id);
  const { viewer } = useViewer();
  const { data: organisers } = useOrganisers();

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<FormValues>({ defaultValues: defaultsFrom(event), mode: "onTouched" });

  const values = useWatch({ control }) as FormValues; // drives the live preview and counters
  // Captured once (lazy initializers keep render pure).
  const [minStart] = useState(() => toLocalInputValue(new Date().toISOString()));
  const [sampleStart] = useState(() => new Date(Date.now() + 7 * 864e5).toISOString());
  const registered = event?.registered_count ?? 0;

  // --- Unsaved-changes protection: in-app navigation and tab close/refresh.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !save.isSuccess && currentLocation.pathname !== nextLocation.pathname,
  );

  // Leave only after a render where save.isSuccess is true, so the blocker lets us go.
  useEffect(() => {
    if (save.isSuccess) navigate("/organiser");
  }, [save.isSuccess, navigate]);
  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const onSubmit = handleSubmit((form) => {
    const full: EventInput = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      location: form.location.trim(),
      starts_at: fromLocalInputValue(form.startsAt),
      capacity: form.capacity,
    };
    // On edit, send only what changed (PATCH semantics).
    const payload: Partial<EventInput> = isEdit
      ? Object.fromEntries(
          Object.entries(FIELD_MAP)
            .filter(([, formKey]) => dirtyFields[formKey])
            .map(([apiKey]) => [apiKey, full[apiKey as keyof EventInput]]),
        )
      : full;

    save.mutate(payload, {
      onSuccess: (saved) => {
        toast(
          isEdit
            ? {
                title: event?.status === "REJECTED" ? "Changes saved and resubmitted" : "Changes saved",
                description:
                  event?.status === "REJECTED" ? "An admin will take another look soon." : saved.title,
                action: { label: "View event", to: `/events/${saved.id}` },
              }
            : {
                title: "Event submitted for review",
                description: "We'll publish it once an admin has checked it over.",
                action: { label: "View event", to: `/events/${saved.id}` },
              },
        );
      },
      onError: (error) => {
        if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
          // The server is the source of truth for validation: show its messages on the right fields.
          for (const [apiField, message] of Object.entries(error.fields)) {
            const field = FIELD_MAP[apiField];
            if (field) setError(field, { type: "server", message }, { shouldFocus: true });
            else setError("root.server", { type: "server", message });
          }
        } else {
          setError("root.server", { type: "server", message: toFriendlyError(error).message });
        }
      },
    });
  });

  const previewEvent = {
    id: event?.id ?? "EVT-preview",
    title: values.title.trim() || "Your event title",
    category_label: CATEGORIES.find((c) => c.value === values.category)?.label ?? "Community",
    location: values.location.trim(),
    starts_at: values.startsAt ? fromLocalInputValue(values.startsAt) : sampleStart,
    capacity: Number.isFinite(values.capacity) && values.capacity > 0 ? values.capacity : 20,
    registered_count: registered,
    spots_remaining: Math.max((Number.isFinite(values.capacity) ? values.capacity : 20) - registered, 0),
    status: "PUBLISHED" as const,
    organiser: { id: viewer.organiserId ?? "", name: organiserName(organisers, viewer.organiserId) },
  };

  const tz = `${timeZoneLabel()}, ${userTimeZone.replace(/_/g, " ")}`;

  return (
    <div>
      <Link
        to="/organiser"
        className="mb-5 inline-flex h-11 items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg sm:h-auto"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Your events
      </Link>
      <PageHeader
        title={isEdit ? "Edit event" : "New event"}
        description={
          isEdit
            ? "Changes to a published event go live straight away."
            : "Tell people what's happening. An admin reviews new events before they're published."
        }
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={onSubmit} noValidate className="space-y-6 rounded-xl border border-border bg-surface p-5 shadow-card sm:p-6">
          {event?.status === "REJECTED" && (
            <Callout tone="danger" icon={<CircleAlert />} title="An admin requested changes">
              {event.review_note ? `“${event.review_note}”` : "Update the details below and save to resubmit."}
            </Callout>
          )}
          {errors.root?.server && (
            <div role="alert">
              <Callout tone="danger" icon={<CircleAlert />} title="We couldn't save your event">
                {errors.root.server.message}
              </Callout>
            </div>
          )}

          <Field
            id="title"
            label="Title"
            error={errors.title?.message}
            counter={<CharCount value={values.title.length} max={LIMITS.title} />}
          >
            <Input
              id="title"
              placeholder="Community Repair Café"
              invalid={!!errors.title}
              aria-describedby={describedBy("title", errors.title?.message)}
              {...register("title", {
                validate: (v) => v.trim().length > 0 || "Give your event a title.",
                maxLength: { value: LIMITS.title, message: `Keep the title to ${LIMITS.title} characters or fewer.` },
              })}
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field id="category" label="Category" error={errors.category?.message}>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select
                    id="category"
                    value={field.value}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                    options={CATEGORIES}
                    invalid={!!errors.category}
                  />
                )}
              />
            </Field>

            <Field
              id="capacity"
              label="Capacity"
              error={errors.capacity?.message}
              hint={registered > 0 ? `At least ${registered}: people have already registered.` : "How many people can come."}
            >
              <Input
                id="capacity"
                type="number"
                inputMode="numeric"
                min={Math.max(1, registered)}
                max={LIMITS.capacity}
                step={1}
                placeholder="20"
                invalid={!!errors.capacity}
                aria-describedby={describedBy("capacity", errors.capacity?.message, true)}
                {...register("capacity", {
                  valueAsNumber: true,
                  validate: (v) => {
                    if (!Number.isFinite(v)) return "Set how many people can attend.";
                    if (!Number.isInteger(v)) return "Capacity must be a whole number, like 20.";
                    if (v < 1) return "Capacity must be at least 1.";
                    if (v > LIMITS.capacity) return `Capacity must be ${LIMITS.capacity.toLocaleString()} or fewer.`;
                    if (v < registered) return `${registered} people have already registered, so capacity can't go below ${registered}.`;
                    return true;
                  },
                })}
              />
            </Field>
          </div>

          <Field id="startsAt" label="Date and time" error={errors.startsAt?.message} hint={`Shown in your local time (${tz}).`}>
            <Input
              id="startsAt"
              type="datetime-local"
              min={minStart}
              invalid={!!errors.startsAt}
              aria-describedby={describedBy("startsAt", errors.startsAt?.message, true)}
              className="[color-scheme:light] dark:[color-scheme:dark]"
              {...register("startsAt", {
                validate: (v) => validateStartsAt(v, event?.starts_at),
              })}
            />
          </Field>

          <Field id="location" label="Location" optional error={errors.location?.message}>
            <Input
              id="location"
              placeholder="Riverside Community Hall"
              invalid={!!errors.location}
              {...register("location", {
                maxLength: { value: LIMITS.location, message: `Keep the location to ${LIMITS.location} characters or fewer.` },
              })}
            />
          </Field>

          <Field
            id="description"
            label="Description"
            optional
            error={errors.description?.message}
            hint="Plain text. Line breaks are kept."
            counter={<CharCount value={values.description.length} max={LIMITS.description} />}
          >
            <Textarea
              id="description"
              rows={6}
              placeholder="What will happen, who it's for, and anything people should bring."
              invalid={!!errors.description}
              aria-describedby={describedBy("description", errors.description?.message, true)}
              {...register("description", {
                maxLength: {
                  value: LIMITS.description,
                  message: `Keep the description to ${LIMITS.description} characters or fewer.`,
                },
              })}
            />
          </Field>

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-1.5 text-xs text-fg-subtle">
              <Info className="size-3.5 shrink-0" aria-hidden="true" />
              {isEdit ? "Saving keeps its current status." : "New events start as pending review."}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button asChild>
                <Link to="/organiser">Cancel</Link>
              </Button>
              <Button type="submit" variant="primary" loading={save.isPending}>
                {!save.isPending && <Send className="size-4" aria-hidden="true" />}
                {isEdit ? (event?.status === "REJECTED" ? "Save and resubmit" : "Save changes") : "Submit for review"}
              </Button>
            </div>
          </div>
        </form>

        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Live preview">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-fg-muted">
            <Eye className="size-4" aria-hidden="true" />
            Preview: how visitors will see it
          </p>
          <EventCard event={previewEvent} preview />
          <p className="mt-3 text-xs leading-relaxed text-fg-subtle">
            Visitors only see this card once an admin has published your event.
          </p>
        </aside>
      </div>

      <ConfirmDialog
        open={blocker.state === "blocked"}
        onOpenChange={(open) => !open && blocker.reset?.()}
        title="Discard your changes?"
        description="You've made changes that haven't been saved. If you leave now, they'll be lost."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        tone="danger"
        onConfirm={() => blocker.proceed?.()}
      />
    </div>
  );
}
