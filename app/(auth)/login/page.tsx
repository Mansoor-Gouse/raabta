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
        paddingTop: "calc(1rem + var(--safe-area-inset-top))",
        paddingBottom: "calc(1rem + var(--safe-area-inset-bottom))",
        paddingLeft: "calc(1rem + var(--safe-area-inset-left))",
        paddingRight: "calc(1rem + var(--safe-area-inset-right))",
      }}
    >
      <div className="w-full max-w-sm space-y-5 sm:space-y-6 p-4 sm:p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <h1 className="text-xl sm:text-2xl font-semibold text-center">
          Sign in
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center px-1">
          Enter your mobile number. We&apos;ll send a verification code (device
          binding flow).
        </p>
        <form onSubmit={handleSendCode} className="space-y-4">
          <input
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-base min-h-[48px]"
            required
          />
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-50 min-h-[48px] touch-manipulation"
          >
            {loading ? "Sending…" : "Send code"}
          </button>
        </form>
        <p className="text-center text-sm">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline min-h-[44px] inline-flex items-center justify-center"
          >
            Back
          </Link>
        </p>
      </div>
    </main>
  );
}
