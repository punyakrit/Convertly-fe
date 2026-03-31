"use client";

import { useState, useEffect, useCallback } from "react";
import { getUserId } from "@/lib/helpers";

export function useUser() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const register = useCallback(async () => {
    try {
      const deviceId = getUserId();
      const res = await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: deviceId }),
      });
      const data = await res.json();
      if (data.success) {
        setUserId(data.data.id);
        localStorage.setItem("convertly_supabase_user_id", data.data.id);
      }
    } catch {
      // offline — use local ID
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    const stored = typeof window !== "undefined"
      ? localStorage.getItem("convertly_supabase_user_id")
      : null;
    if (stored) {
      setUserId(stored);
      setIsReady(true);
    }
    register();
  }, [register]);

  return { userId, isReady };
}
