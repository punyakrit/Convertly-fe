import type { HistoryEntry } from "@/lib/types";

const STORAGE_KEY = "convertly_history_v1";
const MAX_ENTRIES = 20;
const MAX_APPROX_BYTES = 4_500_000;

function approxEntryBytes(e: HistoryEntry): number {
  return (
    e.id.length +
    e.file_name.length +
    e.input_type.length +
    e.output_type.length +
    e.original_url.length +
    e.converted_url.length +
    e.created_at.length +
    64
  );
}

function loadRaw(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRaw(entries: HistoryEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function totalApproxBytes(entries: HistoryEntry[]): number {
  return entries.reduce((sum, e) => sum + approxEntryBytes(e), 0);
}

export function getHistoryEntries(): HistoryEntry[] {
  return loadRaw();
}

export function addHistoryEntry(entry: HistoryEntry): { ok: true } | { ok: false; error: string } {
  if (typeof window === "undefined") {
    return { ok: false, error: "History is only available in the browser" };
  }
  let entries = loadRaw();
  const newBytes = approxEntryBytes(entry);
  if (newBytes > MAX_APPROX_BYTES) {
    return { ok: false, error: "File is too large to save in browser history" };
  }

  entries = entries.filter((e) => e.id !== entry.id);
  entries.unshift(entry);

  while (entries.length > MAX_ENTRIES) {
    entries.pop();
  }

  while (entries.length > 0 && totalApproxBytes(entries) > MAX_APPROX_BYTES) {
    entries.pop();
  }

  if (totalApproxBytes(entries) > MAX_APPROX_BYTES) {
    return { ok: false, error: "Not enough browser storage for this file" };
  }

  try {
    saveRaw(entries);
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save to browser storage" };
  }
}

export function removeHistoryEntry(id: string): void {
  if (typeof window === "undefined") return;
  const entries = loadRaw().filter((e) => e.id !== id);
  saveRaw(entries);
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
