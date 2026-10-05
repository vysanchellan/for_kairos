/**
 * A tiny global toast store. `toast()` can be called from anywhere (mutation
 * callbacks, for example) without threading a context through.
 */

import { useSyncExternalStore } from "react";

export type ToastTone = "success" | "info" | "error";

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
  action?: { label: string; to: string };
}

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function toast(input: Omit<ToastItem, "id" | "tone"> & { tone?: ToastTone }): void {
  items = [...items.slice(-3), { tone: "success", ...input, id: nextId++ }];
  emit();
}

export function dismissToast(id: number): void {
  items = items.filter((item) => item.id !== id);
  emit();
}

export function useToasts(): ToastItem[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => items,
  );
}
