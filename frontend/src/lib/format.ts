/** Date and number formatting. All dates are shown in the viewer's local time zone. */

const locale = undefined; // the browser's locale

export const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function formatDateBlock(iso: string): { month: string; day: string; weekday: string } {
  const date = new Date(iso);
  return {
    month: date.toLocaleString(locale, { month: "short" }).toUpperCase(),
    day: date.toLocaleString(locale, { day: "numeric" }),
    weekday: date.toLocaleString(locale, { weekday: "short" }),
  };
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShortDateTime(iso: string): string {
  return new Date(iso).toLocaleString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** e.g. "GMT+1" for the viewer's zone right now. */
export function timeZoneLabel(date = new Date()): string {
  const part = new Intl.DateTimeFormat(locale, { timeZoneName: "short" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? userTimeZone;
}

const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "just now", "5 minutes ago", "in 3 days" */
export function formatRelative(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  if (Math.abs(seconds) < 45) return "just now";
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size || unit === "minute") {
      return relative.format(Math.round(seconds / size), unit);
    }
  }
  return "just now";
}

/** Value for <input type="datetime-local"> in the viewer's local time. */
export function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/** <input type="datetime-local"> value (local time, no zone) -> ISO 8601 in UTC. */
export function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString();
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString(locale)} ${count === 1 ? singular : plural}`;
}
