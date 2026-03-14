"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
        body: JSON.stringify({ action: "send", phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send code");
        return;
      }
      router.push(`/verify?phone=${encodeURIComponent(phone.trim())}`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

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
            Sign in
          </h1>
          <p className="text-sm text-[#737373]">
            Enter your mobile number. We&apos;ll send a verification code.
          </p>
        </div>
        <form onSubmit={handleSendCode} className="space-y-5">
          <input
            ref={inputRef}
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (error) setError("");
            }}
            className="w-full px-4 py-3.5 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] text-[#0B0B0B] placeholder:text-[#A3A3A3] text-base min-h-[48px] focus:outline-none focus:border-[#1a1a1a]/40 focus:ring-2 focus:ring-[#0B0B0B]/10 transition-colors"
            required
            aria-describedby={error ? "login-error" : undefined}
            aria-invalid={!!error}
          />
          {error && (
            <p id="login-error" className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#1a1a1a] to-[#0B0B0B] text-white font-medium disabled:opacity-50 min-h-[48px] touch-manipulation transition-all duration-300 hover:from-[#2a2a2a] hover:to-[#1a1a1a] hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] active:scale-[0.99]"
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
