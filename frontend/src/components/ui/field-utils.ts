/** aria-describedby value for a field: its error if present, otherwise its hint. */
export function describedBy(id: string, error?: string, hint?: unknown): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}
