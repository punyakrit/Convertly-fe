"use client";

import { useState, useCallback, useEffect } from "react";
import type { HistoryEntry } from "@/lib/types";
import { getUserId } from "@/lib/helpers";

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const userId = getUserId();
    if (!userId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/history?user_id=${userId}&limit=50&offset=0`);
      const data = await res.json();
      if (data.success) setEntries(data.data);
      else setError(data.error);
    } catch {
      setError("Failed to load history");
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      await fetch(`/api/history?id=${id}`, { method: "DELETE" });
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      setError("Failed to delete item");
    }
  }, []);

  const clearAll = useCallback(async () => {
    const userId = getUserId();
    try {
      await fetch(`/api/history?user_id=${userId}`, { method: "DELETE" });
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
