"use client";

import { useState, useCallback, useEffect } from "react";
import type { HistoryEntry } from "@/lib/types";
import {
  getHistoryEntries,
  removeHistoryEntry,
  clearHistory,
} from "@/lib/historyStorage";

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      setEntries(getHistoryEntries());
    } catch {
      setError("Failed to load history");
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      removeHistoryEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      setError("Failed to delete item");
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      clearHistory();
      setEntries([]);
    } catch {
      setError("Failed to clear history");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, loading, error, refresh, remove, clearAll };
}
