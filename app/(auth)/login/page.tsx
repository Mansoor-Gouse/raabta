"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      <div className="w-full max-w-[400px] space-y-6 p-8 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_0_60px_rgba(0,0,0,0.3)]">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl sm:text-3xl font-light text-[#F5F5F5] tracking-tight">
            Sign in
          </h1>
          <p className="text-sm text-[#F5F5F5]/60">
            Enter your mobile number. We&apos;ll send a verification code.
          </p>
        </div>
        <form onSubmit={handleSendCode} className="space-y-5">
          <input
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl border border-white/15 bg-white/5 text-[#F5F5F5] placeholder:text-[#F5F5F5]/40 text-base min-h-[48px] focus:outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10 transition-colors"
            required
          />
          {error && (
            <p className="text-sm text-red-400/90">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#2a2a2a] to-[#1a1a1a] border border-white/10 text-[#F5F5F5] font-medium disabled:opacity-50 min-h-[48px] touch-manipulation transition-all duration-300 hover:from-[#333] hover:to-[#252525] hover:border-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.06)]"
          >
            {loading ? "Sending…" : "Send code"}
          </button>
        </form>
        <p className="text-center">
          <Link
            href="/"
            className="text-sm text-[#F5F5F5]/60 hover:text-[#F5F5F5]/90 transition-colors min-h-[44px] inline-flex items-center justify-center"
          >
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
