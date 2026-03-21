"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/auth-client";

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 10);
}

function formatPhone(raw: string): string {
  const digits = normalizePhone(raw);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("deviceId");
  if (!id) {
    id = crypto.randomUUID() + "-" + Date.now();
    localStorage.setItem("deviceId", id);
  }
  return id;
}

type Step = "phone" | "otp" | "name";

export default function FirebasePhoneOtpForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  const otpLength = 6;

  useEffect(() => {
    if (step === "phone") inputRef.current?.focus();
    else if (step === "otp") codeInputRef.current?.focus();
    else nameInputRef.current?.focus();
  }, [step]);

  useEffect(() => {
    let verifier: RecaptchaVerifier | null = null;
    try {
      const auth = getFirebaseAuth();
      // Firebase Phone Auth requires reCAPTCHA on web. "compact" shows a small widget; "invisible" hides it (badge may still appear).
      verifier = new RecaptchaVerifier(auth, "firebase-recaptcha-container", {
        size: "compact",
      });
      recaptchaVerifierRef.current = verifier;
    } catch (e) {
      console.error(e);
      setError("Firebase is not configured correctly.");
    }
    return () => {
      try {
        verifier?.clear();
      } catch {
        /* ignore */
      }
      recaptchaVerifierRef.current = null;
    };
  }, []);

  const finishLogin = useCallback(async () => {
    const deviceId = getDeviceId();
    await fetch("/api/device-bind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId }),
    });
    try {
      await signOut(getFirebaseAuth());
    } catch {
      /* ignore */
    }
    router.push("/app");
    router.refresh();
  }, [router]);

  const exchangeSession = useCallback(
    async (idToken: string, nameOpt?: string) => {
      const res = await fetch("/api/auth/firebase-otp-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          ...(nameOpt ? { name: nameOpt } : {}),
        }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not sign in");
      }
      return data as { ok: boolean; needsName: boolean };
    },
    []
  );

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const digits = normalizePhone(phone);
    if (digits.length < 10) return;
    const verifier = recaptchaVerifierRef.current;
    if (!verifier) {
      setError("Verification is not ready. Refresh and try again.");
      return;
    }
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      const e164 = `+91${digits}`;
      const confirmation = await signInWithPhoneNumber(auth, e164, verifier);
      confirmationRef.current = confirmation;
      setStep("otp");
      setCode("");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to send code";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const conf = confirmationRef.current;
    if (!conf || code.trim().length < 4) return;
    setLoading(true);
    try {
      const cred = await conf.confirm(code.trim());
      const idToken = await cred.user.getIdToken();
      const data = await exchangeSession(idToken);
      if (data.needsName) {
        setStep("name");
        return;
      }
      await finishLogin();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Invalid code";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitName(e: React.FormEvent) {
    e.preventDefault();
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
        setError((data as { error?: string }).error || "Could not save name");
        return;
      }
      await finishLogin();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const displayPhone = `+91 ${normalizePhone(phone)}`;

  return (
    <>
      {/* Always mounted (Firebase requirement). Shown on phone step — placed above the form so it’s visible. */}
      <div
        id="firebase-recaptcha-container"
        className={
          step === "phone"
            ? "mx-auto flex min-h-[78px] w-full max-w-[400px] justify-center px-4 pb-2 pt-4"
            : "sr-only"
        }
        aria-hidden={step !== "phone"}
      />
      {step === "name" ? (
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
            <p className="text-sm text-[#737373]">What should we call you?</p>
          </div>
          <form onSubmit={handleSubmitName} className="space-y-5">
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
              aria-describedby={error ? "fb-name-error" : undefined}
              aria-invalid={!!error}
            />
            {error && (
              <p id="fb-name-error" className="text-sm text-red-600" role="alert">
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
      ) : step === "otp" ? (
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
              Enter the code sent via SMS to{" "}
              <span className="font-medium text-[#111827]">{displayPhone}</span>.
            </p>
          </div>
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="fb-otp-input"
                className="text-sm font-medium text-[#111827]"
              >
                One-time password
              </label>
              <div
                className="auth-otp-wrap grid grid-cols-6 gap-2 p-0.5 -m-0.5 transition-shadow"
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
                id="fb-otp-input"
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
                className="auth-otp-input absolute opacity-0 pointer-events-none w-px h-px overflow-hidden"
                maxLength={otpLength}
                aria-describedby={error ? "fb-verify-error" : "fb-verify-help"}
                aria-invalid={!!error}
              />
              <p id="fb-verify-help" className="text-xs text-[#6B7280]">
                Tip: You can paste the full code directly.
              </p>
            </div>
            {error && (
              <p id="fb-verify-error" className="text-sm text-red-600" role="alert">
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
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setCode("");
                setError("");
                confirmationRef.current = null;
              }}
              className="text-sm text-[#737373] hover:text-[#0B0B0B] transition-colors min-h-[44px] inline-flex items-center justify-center"
            >
              Change number
            </button>
          </p>
        </div>
      </main>
      ) : (
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
            <label htmlFor="fb-phone" className="text-sm font-medium text-[#111827]">
              Mobile number
            </label>
            <div className="group flex items-center gap-3 rounded-2xl border border-[#DADDE3] bg-[#F8FAFC] px-3 py-2 min-h-[56px] transition-colors focus-within:border-[#0B0B0B] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0B0B0B]/25">
              <div className="inline-flex items-center gap-2 rounded-xl bg-white px-2.5 py-2 border border-[#E5E7EB] text-sm font-medium text-[#111827]">
                <span aria-hidden>🇮🇳</span>
                <span>+91</span>
              </div>
              <input
                id="fb-phone"
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
                aria-describedby={error ? "fb-login-error" : "fb-login-help"}
                aria-invalid={!!error}
              />
            </div>
            <p id="fb-login-help" className="text-xs text-[#6B7280]">
              We only use this to verify your account.
            </p>
          </div>
          {error && (
            <p id="fb-login-error" className="text-sm text-red-600" role="alert">
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
        <p className="text-center text-[11px] leading-relaxed text-[#9CA3AF] px-1">
          SMS sign-in uses Google reCAPTCHA. Complete the challenge above this card, then tap Send
          code.
        </p>
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
      )}
    </>
  );
}
