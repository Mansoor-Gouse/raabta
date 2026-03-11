"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("deviceId");
  if (!id) {
    id = crypto.randomUUID() + "-" + Date.now();
    localStorage.setItem("deviceId", id);
  }
  return id;
}

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") || "";
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<"code" | "name">("code");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const finishLogin = useCallback(async () => {
    const deviceId = getDeviceId();
    await fetch("/api/device-bind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId }),
    });
    router.push("/app");
    router.refresh();
  }, [router]);

  const handleVerify = useCallback(async () => {
    if (!phone || !code.trim()) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/phone-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          phone: phone.trim(),
          code: code.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid code");
        return;
      }
      if (data.needsName) {
        setStep("name");
        return;
      }
      await finishLogin();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [phone, code, finishLogin]);

  const handleSubmitName = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not save name");
        return;
      }
      await finishLogin();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [name, finishLogin]);

  useEffect(() => {
    if (!phone) router.replace("/login");
  }, [phone, router]);

  if (step === "name") {
    return (
      <main
        className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6"
        style={{
          paddingTop: "calc(1rem + var(--safe-area-inset-top))",
          paddingBottom: "calc(1rem + var(--safe-area-inset-bottom))",
          paddingLeft: "calc(1rem + var(--safe-area-inset-left))",
          paddingRight: "calc(1rem + var(--safe-area-inset-right))",
        }}
      >
        <div className="w-full max-w-sm space-y-5 sm:space-y-6 p-4 sm:p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <h1 className="text-xl sm:text-2xl font-semibold text-center">
            Welcome
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center px-1">
            What should we call you?
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmitName();
            }}
            className="space-y-4"
          >
            <input
              type="text"
              autoComplete="name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 100))}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 min-h-[48px]"
            />
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-50 min-h-[48px] touch-manipulation"
            >
              {loading ? "Saving…" : "Continue"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6"
      style={{
        paddingTop: "calc(1rem + var(--safe-area-inset-top))",
        paddingBottom: "calc(1rem + var(--safe-area-inset-bottom))",
        paddingLeft: "calc(1rem + var(--safe-area-inset-left))",
        paddingRight: "calc(1rem + var(--safe-area-inset-right))",
      }}
    >
      <div className="w-full max-w-sm space-y-5 sm:space-y-6 p-4 sm:p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <h1 className="text-xl sm:text-2xl font-semibold text-center">
          Verify
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center px-1">
          Enter the code sent to your device (device binding will be saved).
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerify();
          }}
          className="space-y-4"
        >
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Verification code"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-center text-lg sm:text-xl tracking-widest min-h-[48px]"
            maxLength={6}
          />
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || code.length < 4}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-50 min-h-[48px] touch-manipulation"
          >
            {loading ? "Verifying…" : "Verify"}
          </button>
        </form>
        <p className="text-center text-sm">
          <Link
            href="/login"
            className="text-blue-600 dark:text-blue-400 hover:underline min-h-[44px] inline-flex items-center justify-center"
          >
            Change number
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh flex items-center justify-center p-4">
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        </main>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
