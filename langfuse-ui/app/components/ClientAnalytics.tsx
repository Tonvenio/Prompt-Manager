"use client";

import { useEffect, useRef } from "react";

export function trackClient(type: string, props: Record<string, any> = {}) {
  try {
    navigator.sendBeacon?.(
      "/api/analytics/track",
      new Blob([JSON.stringify({ type, props, timestamp: new Date().toISOString() })], {
        type: "application/json",
      })
    );
  } catch {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, props, timestamp: new Date().toISOString() }),
      keepalive: true,
    }).catch(() => {});
  }
}

export function ClientAnalyticsHeartbeat({ intervalMs = 15000 }: { intervalMs?: number }) {
  const lastActiveRef = useRef<number>(Date.now());

  useEffect(() => {
    function markActive() {
      lastActiveRef.current = Date.now();
    }
    const events = ["mousemove", "keydown", "click", "scroll", "visibilitychange"] as const;
    events.forEach((ev) => window.addEventListener(ev, markActive, { passive: true } as any));
    return () => events.forEach((ev) => window.removeEventListener(ev, markActive as any));
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      // Only send heartbeat if user was active in the last interval
      if (Date.now() - lastActiveRef.current < intervalMs * 1.5) {
        trackClient("heartbeat", { path: window.location.pathname });
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  useEffect(() => {
    // Track page view
    trackClient("page_view", { path: window.location.pathname });
  }, []);

  return null;
}



