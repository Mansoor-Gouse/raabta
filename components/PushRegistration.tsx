"use client";

import React, { useCallback, useState } from "react";

const STORAGE_KEY_DISMISSED = "push_prompt_dismissed";
const STORAGE_KEY_LAST_SYNC = "push_subscription_last_sync_ms";
const SW_PATH = "/sw.js";
const SUBSCRIPTION_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "==".slice(0, (4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function isSecureContext(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext || window.location?.protocol === "https:" || window.location?.hostname === "localhost";
}

export type PushRegisterResult = "granted" | "denied" | "unsupported";

export async function registerForPush(): Promise<PushRegisterResult> {
  if (typeof window === "undefined") return "unsupported";
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapid?.trim()) return "unsupported";
  if (!isSecureContext()) return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";

  const perm = Notification.permission;
  if (perm === "denied") return "denied";

  try {
    const registration = await navigator.serviceWorker.register(SW_PATH);
    await (registration as unknown as { ready: Promise<ServiceWorkerRegistration> }).ready;

    let subscription = await registration.pushManager.getSubscription();
    if (perm === "granted" && subscription) {
      await sendSubscriptionToBackend(subscription);
      return "granted";
    }

    if (perm === "default") {
      const newPerm = await Notification.requestPermission();
      if (newPerm !== "granted") return "denied";
    }

    subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(vapid);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });
    }
    await sendSubscriptionToBackend(subscription);
    return "granted";
  } catch (err) {
    console.error("[PushRegistration]", err);
    return "denied";
  }
}

async function ensurePushSubscriptionSynced(): Promise<void> {
  if (typeof window === "undefined") return;
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapid?.trim()) return;
  if (!isSecureContext()) return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const registration = await navigator.serviceWorker.register(SW_PATH);
  await (registration as unknown as { ready: Promise<ServiceWorkerRegistration> }).ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const applicationServerKey = urlBase64ToUint8Array(vapid);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as BufferSource,
    });
  }
  await sendSubscriptionToBackend(subscription);
  try {
    localStorage.setItem(STORAGE_KEY_LAST_SYNC, String(Date.now()));
  } catch {
    // ignore storage failures
  }
}

export function usePushSubscriptionAutoSync(): void {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isPushSupported()) return;

    const shouldSync = () => {
      if (getPushPermission() !== "granted") return false;
      try {
        const last = Number(localStorage.getItem(STORAGE_KEY_LAST_SYNC) || "0");
        return Date.now() - last >= SUBSCRIPTION_SYNC_INTERVAL_MS;
      } catch {
        return true;
      }
    };

    const maybeSync = () => {
      if (!shouldSync()) return;
      void ensurePushSubscriptionSynced().catch((err) => {
        console.warn("[PushRegistration] auto sync failed", err);
      });
    };

    // initial check
    maybeSync();

    const onVisibility = () => {
      if (document.visibilityState === "visible") maybeSync();
    };
    const onFocus = () => maybeSync();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}

async function sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
  const keyP256 = subscription.getKey("p256dh");
  const keyAuth = subscription.getKey("auth");
  if (!keyP256 || !keyAuth) throw new Error("Missing subscription keys");
  const res = await fetch("/api/push-subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(keyP256),
        auth: arrayBufferToBase64(keyAuth),
      },
    }),
  });
  if (!res.ok) throw new Error("Failed to save subscription");
}

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() &&
    isSecureContext() &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getPushPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export function wasPushPromptDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(STORAGE_KEY_DISMISSED) === "1";
  } catch {
    return false;
  }
}

export function setPushPromptDismissed(dismissed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (dismissed) localStorage.setItem(STORAGE_KEY_DISMISSED, "1");
    else localStorage.removeItem(STORAGE_KEY_DISMISSED);
  } catch {
    // ignore
  }
}

export function getLastPushSyncAt(): Date | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_SYNC);
    if (!raw) return null;
    const ts = Number(raw);
    if (!Number.isFinite(ts) || ts <= 0) return null;
    const date = new Date(ts);
    return Number.isFinite(date.getTime()) ? date : null;
  } catch {
    return null;
  }
}

type PushPromptBannerProps = {
  onDismiss?: () => void;
  className?: string;
};

export function PushPromptBanner({ onDismiss, className = "" }: PushPromptBannerProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "granted" | "denied" | "error">("idle");

  const handleEnable = useCallback(async () => {
    setLoading(true);
    setStatus("idle");
    try {
      const result = await registerForPush();
      if (result === "granted") {
        setStatus("granted");
        setPushPromptDismissed(true);
        onDismiss?.();
      } else if (result === "denied") {
        setStatus("denied");
        setPushPromptDismissed(true);
        onDismiss?.();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }, [onDismiss]);

  const handleDismiss = useCallback(() => {
    setPushPromptDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  if (!isPushSupported()) return null;

  if (status === "granted") return null;
  if (status === "denied") return null;

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-3 bg-[var(--ig-border-light)] border-b border-[var(--ig-border)] ${className}`}
      role="region"
      aria-label="Push notifications"
    >
      <p className="text-sm text-[var(--ig-text)] flex-1 min-w-0">
        Get notified of new messages.
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleEnable}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--ig-text)] text-[var(--ig-bg-primary)] hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Enabling…" : "Enable"}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 rounded-full text-[var(--ig-text-secondary)] hover:bg-[var(--ig-border)]"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function PushSettingsSection() {
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  const updatePermission = useCallback(() => {
    setPermission(getPushPermission());
  }, []);

  React.useEffect(() => {
    updatePermission();
    setLastSyncAt(getLastPushSyncAt());
  }, [updatePermission]);

  const handleEnable = useCallback(async () => {
    setLoading(true);
    setTestResult(null);
    try {
      await registerForPush();
      updatePermission();
      setLastSyncAt(getLastPushSyncAt());
    } finally {
      setLoading(false);
    }
  }, [updatePermission]);

  const handleTestPush = useCallback(async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/push-test", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTestResult("Test sent. Check your device for the notification.");
      } else {
        setTestResult(data?.error || "Failed to send test.");
      }
    } catch {
      setTestResult("Request failed.");
    } finally {
      setTestLoading(false);
    }
  }, []);

  if (!isPushSupported()) {
    return (
      <section className="mb-6" aria-labelledby="push-settings-heading">
        <h3 id="push-settings-heading" className="text-sm font-semibold text-[var(--ig-text)] mb-2">
          Push notifications
        </h3>
        <p className="text-sm text-[var(--ig-text-secondary)]">
          Not available (use HTTPS and enable in environment).
        </p>
      </section>
    );
  }

  const status =
    permission === "granted"
      ? "Enabled"
      : permission === "denied"
        ? "Disabled"
        : permission === "default"
          ? "Not set"
          : "Unknown";

  return (
    <section className="mb-6" aria-labelledby="push-settings-heading">
      <h3 id="push-settings-heading" className="text-sm font-semibold text-[var(--ig-text)] mb-2">
        Push notifications
      </h3>
      <p className="text-sm text-[var(--ig-text-secondary)] mb-2">
        Get notified of new messages when the app is in the background.
      </p>
      <p className="text-sm text-[var(--ig-text)] mb-2">
        Status: <span className="font-medium">{status}</span>
      </p>
      <p className="text-xs text-[var(--ig-text-secondary)] mb-2">
        Last subscription sync: {lastSyncAt ? lastSyncAt.toLocaleString() : "Not synced yet"}
      </p>
      {permission !== "granted" && (
        <button
          type="button"
          onClick={handleEnable}
          disabled={loading}
          className="px-3 py-2 rounded-lg text-sm font-medium bg-[var(--ig-text)] text-[var(--ig-bg-primary)] hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Enabling…" : "Enable notifications"}
        </button>
      )}
      {permission === "granted" && (
        <button
          type="button"
          onClick={handleTestPush}
          disabled={testLoading}
          className="mt-2 px-3 py-2 rounded-lg text-sm font-medium border border-[var(--ig-border)] text-[var(--ig-text)] hover:bg-[var(--ig-border-light)] disabled:opacity-60"
        >
          {testLoading ? "Sending…" : "Send test notification"}
        </button>
      )}
      {testResult && (
        <p className="mt-2 text-sm text-[var(--ig-text-secondary)]">{testResult}</p>
      )}
    </section>
  );
}
