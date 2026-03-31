"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getDeviceId, getUserId, setUserId } from "@/lib/helpers";

interface UserContextValue {
  userId: string;
  isReady: boolean;
}

const UserContext = createContext<UserContextValue>({ userId: "", isReady: false });

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserIdState] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function init() {
      // Check if already registered
      const existing = getUserId();
      if (existing) {
        setUserIdState(existing);
        setIsReady(true);
        // Still sync in background
        syncUser(existing);
        return;
      }

      // Register new user
      try {
        const deviceId = getDeviceId();
        const res = await fetch("/api/user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_id: deviceId }),
        });
        const data = await res.json();
        if (data.success && data.data?.id) {
          setUserId(data.data.id);
          setUserIdState(data.data.id);
        }
      } catch {
        // offline — will retry next load
      } finally {
        setIsReady(true);
      }
    }

    async function syncUser(existingId: string) {
      try {
        const deviceId = getDeviceId();
        const res = await fetch("/api/user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_id: deviceId }),
        });
        const data = await res.json();
        if (data.success && data.data?.id && data.data.id !== existingId) {
          setUserId(data.data.id);
          setUserIdState(data.data.id);
        }
      } catch {
        // silent
      }
    }

    init();
  }, []);

  return (
    <UserContext.Provider value={{ userId, isReady }}>
      {children}
    </UserContext.Provider>
  );
}
