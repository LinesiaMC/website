"use client";

import { useState, useEffect } from "react";

interface ServerStatus {
  players: number;
  online: boolean;
}

export function useServerStatus() {
  const [status, setStatus] = useState<ServerStatus>({ players: 0, online: false });

  useEffect(() => {
    let mounted = true;

    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/server-status");
        const data = await res.json();
        if (mounted) {
          setStatus({ players: data.players, online: data.online });
        }
      } catch {
        // keep previous state
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 60_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return status;
}
