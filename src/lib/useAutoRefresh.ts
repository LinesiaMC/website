"use client";

import { useEffect, useRef } from "react";

/**
 * Auto-refresh hook: calls `callback` every `intervalMs` (default 2 min)
 * only when the document tab is visible. Pauses when hidden.
 *
 * Interval raised from 30s → 120s to protect the analytics DB. The API
 * layer additionally caches reads for 30s so repeated tabs / pages share
 * the same snapshot.
 */
export function useAutoRefresh(callback: () => void, intervalMs = 120000) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      timer = setInterval(() => cbRef.current(), intervalMs);
    };

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        cbRef.current(); // refresh immediately when tab becomes visible
        start();
      }
    };

    // Start only if visible
    if (!document.hidden) {
      start();
    }

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);
}
