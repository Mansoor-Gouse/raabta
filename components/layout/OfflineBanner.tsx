"use client";

import { useState, useEffect } from "react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    setOffline(!navigator.onLine);
    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);
  if (!offline) return null;
  return (
    <div
      className="bg-amber-500 text-white text-center py-2 px-3 text-sm"
      style={{ paddingTop: "calc(0.5rem + var(--safe-area-inset-top))" }}
      role="status"
      aria-live="polite"
    >
      You are offline. Some features may be unavailable.
    </div>
  );
}
