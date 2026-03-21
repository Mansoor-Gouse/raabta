"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 10);
}

function formatPhone(raw: string): string {
  const digits = normalizePhone(raw);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/phone-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", phone: `+91${normalizePhone(phone)}` }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send code");
        return;
      }
      router.push(`/verify?phone=${encodeURIComponent(`+91${normalizePhone(phone)}`)}`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
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
            Secure sign in
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#0B0B0B] tracking-tight">
            Sign in
          </h1>
          <p className="text-sm text-[#6B7280]">
            Enter your mobile number. We&apos;ll send a verification code via SMS.
          </p>
        </div>
        <form onSubmit={handleSendCode} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium text-[#111827]">
              Mobile number
            </label>
            <div className="group flex items-center gap-3 rounded-2xl border border-[#DADDE3] bg-[#F8FAFC] px-3 py-2 min-h-[56px] transition-colors focus-within:border-[#0B0B0B] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0B0B0B]/25">
              <div className="inline-flex items-center gap-2 rounded-xl bg-white px-2.5 py-2 border border-[#E5E7EB] text-sm font-medium text-[#111827]">
                <span aria-hidden>🇮🇳</span>
                <span>+91</span>
              </div>
              <input
                id="phone"
                ref={inputRef}
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="987 654 3210"
                value={formatPhone(phone)}
                onChange={(e) => {
                  setPhone(normalizePhone(e.target.value));
                  if (error) setError("");
                }}
                className="w-full bg-transparent text-[#0B0B0B] placeholder:text-[#9CA3AF] text-base tracking-[0.02em] min-h-[44px] focus:outline-none"
                required
                aria-describedby={error ? "login-error" : "login-help"}
                aria-invalid={!!error}
              />
            </div>
            <p id="login-help" className="text-xs text-[#6B7280]">
              We only use this to verify your account.
            </p>
          </div>
          {error && (
            <p id="login-error" className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || normalizePhone(phone).length < 10}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#111827] to-[#0B0B0B] text-white font-medium disabled:opacity-50 min-h-[52px] touch-manipulation transition-all duration-300 hover:from-[#1F2937] hover:to-[#111827] hover:shadow-[0_8px_18px_rgba(0,0,0,0.2)] active:scale-[0.99]"
          >
            {loading ? "Sending…" : "Send code"}
          </button>
        </form>
        <p className="text-center">
          <Link
            href="/"
            className="text-sm text-[#737373] hover:text-[#0B0B0B] transition-colors min-h-[44px] inline-flex items-center justify-center"
          >
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
