"use client";

import { useState, useRef, useEffect } from "react";
import { useChannelStateContext, useChatContext } from "stream-chat-react";
import { GroupMembersSheet } from "./GroupMembersSheet";

export function ChannelOptionsMenu() {
  const { channel } = useChannelStateContext();
  const { client } = useChatContext();
  const [open, setOpen] = useState(false);
  const [membersSheetOpen, setMembersSheetOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const members = channel?.state?.members ?? {};
  const memberCount = Object.keys(members).length;
  const isGroup = memberCount > 2;
  const currentUserId = client?.userID ?? "";
  type MemberEntry = { user_id?: string; user?: { id?: string } };
  const otherMember = Object.values(members).find((m: unknown) => ((m as MemberEntry).user_id ?? (m as MemberEntry).user?.id) !== currentUserId) as MemberEntry | undefined;
  const otherUserId = otherMember?.user_id ?? otherMember?.user?.id;

  async function handleBlock() {
    if (!otherUserId) return;
    const res = await fetch("/api/me/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: otherUserId }),
    });
    if (res.ok) {
      setOpen(false);
      window.location.href = "/app";
    }
  }

  async function handleReportChannel() {
    if (!channel?.id) return;
    const reason = window.prompt("Reason for reporting this chat (optional):");
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: "channel", targetId: channel.id, reason: reason ?? undefined }),
    });
    if (res.ok) {
      setOpen(false);
    }
  }

  const retention = (channel?.data as { message_retention?: string })?.message_retention;
  const retentionLabel = retention === "86400" ? "24h" : retention === "604800" ? "7d" : null;

  async function setDisappearing(value: "off" | "24h" | "7d") {
    if (!channel) return;
    try {
      const message_retention = value === "off" ? "infinite" : value === "24h" ? "86400" : "604800";
      await channel.update({ message_retention } as Record<string, unknown>);
      setOpen(false);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="p-2 rounded-lg text-[var(--ig-text-secondary)] hover:bg-[var(--ig-border-light)]"
        aria-label="Channel options"
        aria-expanded={open}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg bg-[var(--ig-bg-primary)] border border-[var(--ig-border)] min-w-[160px] z-20">
          {isGroup && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setMembersSheetOpen(true);
              }}
              className="w-full text-left px-3 py-2 text-sm text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
            >
              View group members
            </button>
          )}
          {isGroup && <div className="border-t border-[var(--ig-border)] my-1" />}
          {otherUserId && (
            <button
              type="button"
              onClick={handleBlock}
              className="w-full text-left px-3 py-2 text-sm text-[var(--ig-error)] hover:bg-[var(--ig-border-light)]"
            >
              Block user
            </button>
          )}
          <div className="border-t border-[var(--ig-border)] my-1" />
          <div className="px-3 py-1.5 text-xs font-medium text-[var(--ig-text-secondary)]">
            Disappearing messages {retentionLabel && `(${retentionLabel})`}
          </div>
          <button
            type="button"
            onClick={() => setDisappearing("off")}
            className="w-full text-left px-3 py-2 text-sm text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
          >
            Off
          </button>
          <button
            type="button"
            onClick={() => setDisappearing("24h")}
            className="w-full text-left px-3 py-2 text-sm text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
          >
            24 hours
          </button>
          <button
            type="button"
            onClick={() => setDisappearing("7d")}
            className="w-full text-left px-3 py-2 text-sm text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
          >
            7 days
          </button>
          <div className="border-t border-[var(--ig-border)] my-1" />
          <button
            type="button"
            onClick={handleReportChannel}
            className="w-full text-left px-3 py-2 text-sm text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
          >
            Report chat
          </button>
        </div>
      )}
      <GroupMembersSheet open={membersSheetOpen} onClose={() => setMembersSheetOpen(false)} />
    </div>
  );
}
