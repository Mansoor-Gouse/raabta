"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
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
  const codeInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const otpLength = 6;

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

  useEffect(() => {
    if (step === "code") codeInputRef.current?.focus();
    else nameInputRef.current?.focus();
  }, [step]);

  if (step === "name") {
    return (
      <main
        className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6"
        style={{
          paddingTop: "calc(1.5rem + var(--safe-area-inset-top))",
          paddingBottom: "calc(1.5rem + var(--safe-area-inset-bottom))",
          paddingLeft: "calc(1rem + var(--safe-area-inset-left))",
          paddingRight: "calc(1rem + var(--safe-area-inset-right))",
        }}
      >
        <div className="w-full max-w-[400px] space-y-6 p-8 rounded-2xl bg-white border border-black/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl sm:text-3xl font-light text-[#0B0B0B] tracking-tight">
              Welcome
            </h1>
            <p className="text-sm text-[#737373]">
              What should we call you?
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmitName();
            }}
            className="space-y-5"
          >
            <input
              ref={nameInputRef}
              type="text"
              autoComplete="name"
              placeholder="Your name"
              value={name}
              onChange={(e) => {
                setName(e.target.value.slice(0, 100));
                if (error) setError("");
              }}
              className="w-full px-4 py-3.5 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] text-[#0B0B0B] placeholder:text-[#A3A3A3] min-h-[48px] focus:outline-none focus:border-[#1a1a1a]/40 focus:ring-2 focus:ring-[#0B0B0B]/10 transition-colors"
              aria-describedby={error ? "name-error" : undefined}
              aria-invalid={!!error}
            />
            {error && (
              <p id="name-error" className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#1a1a1a] to-[#0B0B0B] text-white font-medium disabled:opacity-50 min-h-[48px] touch-manipulation transition-all duration-300 hover:from-[#2a2a2a] hover:to-[#1a1a1a] hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] active:scale-[0.99]"
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
      className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-[#F7F8FA] via-[#F3F4F7] to-[#ECEEF2]"
      style={{
        paddingTop: "calc(1.5rem + var(--safe-area-inset-top))",
        paddingBottom: "calc(1.5rem + var(--safe-area-inset-bottom))",
        paddingLeft: "calc(1rem + var(--safe-area-inset-left))",
        paddingRight: "calc(1rem + var(--safe-area-inset-right))",
      }}
    >
      <div className="w-full max-w-[400px] space-y-6 p-7 sm:p-8 rounded-3xl bg-white/95 backdrop-blur border border-black/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
        <div className="space-y-2 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#8A8F98]">
            Confirm identity
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#0B0B0B] tracking-tight">
            Verify
          </h1>
          <p className="text-sm text-[#6B7280]">
            Enter the 6-digit code sent to <span className="font-medium text-[#111827]">{phone}</span>.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerify();
          }}
          className="space-y-5"
        >
          <div className="space-y-2">
            <label htmlFor="otp-hidden-input" className="text-sm font-medium text-[#111827]">
              One-time password
            </label>
            <div
              className="grid grid-cols-6 gap-2"
              onClick={() => codeInputRef.current?.focus()}
            >
              {Array.from({ length: otpLength }).map((_, idx) => (
                <div
                  key={idx}
                  className={`h-12 rounded-xl border text-center text-lg font-semibold leading-[48px] transition-colors ${
                    code[idx]
                      ? "border-[#111827]/45 bg-white text-[#0B0B0B]"
                      : "border-[#DADDE3] bg-[#F8FAFC] text-[#9CA3AF]"
                  }`}
                  aria-hidden
                >
                  {code[idx] || "•"}
                </div>
              ))}
            </div>
            <input
              id="otp-hidden-input"
              ref={codeInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Verification code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, otpLength));
                if (error) setError("");
              }}
              className="absolute opacity-0 pointer-events-none"
              maxLength={otpLength}
              aria-describedby={error ? "verify-error" : "verify-help"}
              aria-invalid={!!error}
            />
            <p id="verify-help" className="text-xs text-[#6B7280]">
              Tip: You can paste the full code directly.
            </p>
          </div>
          {error && (
            <p id="verify-error" className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || code.length < otpLength}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#111827] to-[#0B0B0B] text-white font-medium disabled:opacity-50 min-h-[52px] touch-manipulation transition-all duration-300 hover:from-[#1F2937] hover:to-[#111827] hover:shadow-[0_8px_18px_rgba(0,0,0,0.2)] active:scale-[0.99]"
          >
            {loading ? "Verifying…" : "Verify"}
          </button>
        </form>
        <p className="text-center">
          <Link
            href="/login"
            className="text-sm text-[#737373] hover:text-[#0B0B0B] transition-colors min-h-[44px] inline-flex items-center justify-center"
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
        <main className="min-h-dvh flex items-center justify-center p-4 bg-gradient-to-b from-[#FAFAFA] via-[#F5F5F5] to-[#F0F0F0]">
          <p className="text-[#737373]">Loading…</p>
        </main>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
