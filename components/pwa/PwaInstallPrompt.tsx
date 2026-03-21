"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";

const SW_PATH = "/sw.js";
const STORAGE_DISMISSED = "pwa_install_banner_dismissed_v1";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return window.matchMedia("(display-mode: standalone)").matches;
}

function isEligiblePath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/login" || pathname === "/verify") return true;
  return pathname.startsWith("/app");
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const noChrome = !/CriOS|FxiOS|EdgiOS|OPiOS|mercury/.test(ua);
  return iOS && webkit && noChrome;
}

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  const eligible = isEligiblePath(pathname);

  useEffect(() => {
    setMounted(true);
    try {
      setDismissed(localStorage.getItem(STORAGE_DISMISSED) === "1");
    } catch {
      setDismissed(false);
    }
    setStandalone(isStandalone());
  }, []);

  useEffect(() => {
    if (!mounted || !eligible || standalone) return;
    let cancelled = false;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(SW_PATH).catch(() => {});
    }
    const onBip = (e: Event) => {
      e.preventDefault();
      if (!cancelled) setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      try {
        localStorage.setItem(STORAGE_DISMISSED, "1");
      } catch {
        // ignore
      }
      setDeferred(null);
      setDismissed(true);
      setShowIosHint(false);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [mounted, eligible, standalone]);

  useEffect(() => {
    if (!mounted || !eligible || standalone || dismissed) return;
    if (!isIosSafari()) return;
    const t = window.setTimeout(() => setShowIosHint(true), 1200);
    return () => window.clearTimeout(t);
  }, [mounted, eligible, standalone, dismissed]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_DISMISSED, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
    setShowIosHint(false);
    setDeferred(null);
  }, []);

  const onInstall = useCallback(async () => {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      // user dismissed or prompt failed
    } finally {
      setInstalling(false);
      setDeferred(null);
    }
  }, [deferred]);

  if (!mounted || !eligible || standalone || dismissed) return null;

  const showChrome = deferred !== null;
  const showIos = showIosHint && !showChrome;

  if (!showChrome && !showIos) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] p-3 sm:p-4 flex justify-center pointer-events-none"
      style={{
        paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
        paddingLeft: "max(0.75rem, env(safe-area-inset-left, 0px))",
        paddingRight: "max(0.75rem, env(safe-area-inset-right, 0px))",
      }}
      role="region"
      aria-label="Install app"
    >
      <div
        className="pointer-events-auto w-full max-w-md rounded-2xl border border-black/[0.08] bg-white/95 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3"
      >
        <div className="flex gap-3 items-start min-w-0">
          <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-black/[0.06] bg-white relative">
            <Image src="/icon-192.png" alt="" fill className="object-cover" sizes="48px" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-semibold text-[#0B0B0B]">Install The Rope</p>
            {showChrome ? (
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Add this app to your home screen for quick access and a full-screen experience.
              </p>
            ) : (
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Tap <span className="font-medium text-[#111827]">Share</span>, then{" "}
                <span className="font-medium text-[#111827]">Add to Home Screen</span>.
              </p>
            )}
          </div>
        </div>
        <div
          className={`flex gap-2 shrink-0 w-full sm:w-auto sm:flex-col sm:ml-auto ${showChrome ? "sm:min-w-[7.5rem]" : ""}`}
        >
          {showChrome && (
            <button
              type="button"
              onClick={onInstall}
              disabled={installing}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#111827] to-[#0B0B0B] text-white text-sm font-medium min-h-[44px] touch-manipulation disabled:opacity-60 active:scale-[0.99]"
            >
              {installing ? "…" : "Install"}
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className={`text-sm text-[#737373] active:text-[#0B0B0B] min-h-[44px] px-2 rounded-xl touch-manipulation inline-flex items-center justify-center ${showChrome ? "flex-1 sm:flex-none sm:min-h-0 sm:py-1 sm:text-xs" : "w-full sm:w-auto"}`}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
