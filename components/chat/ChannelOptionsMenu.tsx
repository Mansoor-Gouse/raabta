"use client";

import { useState, useRef, useEffect } from "react";
import { useChannelStateContext, useChatContext } from "stream-chat-react";
import { useGroupMembersOpen } from "./GroupMembersOpenContext";

export function ChannelOptionsMenu() {
  const { channel } = useChannelStateContext();
  const { client } = useChatContext();
  const [open, setOpen] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const groupMembersOpen = useGroupMembersOpen();

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

  const channelData = (channel?.data || {}) as { name?: string; image?: string };
  const currentGroupName = channelData.name ?? "";
  const currentGroupImage = channelData.image ?? "";

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
                groupMembersOpen?.setOpen(true);
              }}
              className="w-full text-left px-3 py-2 text-sm text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
            >
              View group members
            </button>
          )}
          {isGroup && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setEditGroupOpen(true);
              }}
              className="w-full text-left px-3 py-2 text-sm text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
            >
              Edit group
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
      {editGroupOpen && isGroup && channel && (
        <EditGroupModal
          currentName={currentGroupName}
          currentImage={currentGroupImage}
          channel={channel}
          onClose={() => setEditGroupOpen(false)}
        />
      )}
    </div>
  );
}

function EditGroupModal({
  currentName,
  currentImage,
  channel,
  onClose,
}: {
  currentName: string;
  currentImage: string;
  channel: { update: (data: Record<string, unknown>) => Promise<unknown> };
  onClose: () => void;
}) {
  const [name, setName] = useState(currentName);
  const [image, setImage] = useState(currentImage);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await channel.update({ name: name.trim() || undefined, image: image.trim() || undefined } as Record<string, unknown>);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-label="Edit group">
      <div className="bg-[var(--ig-bg-primary)] rounded-xl shadow-xl border border-[var(--ig-border)] w-full max-w-sm p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-[var(--ig-text)] mb-3">Edit group</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-sm font-medium text-[var(--ig-text-secondary)]">
            Group name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] text-[var(--ig-text)] placeholder:text-[var(--ig-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--ig-text)]"
            />
          </label>
          <label className="block text-sm font-medium text-[var(--ig-text-secondary)]">
            Image URL (optional)
            <input
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://..."
              className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] text-[var(--ig-text)] placeholder:text-[var(--ig-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--ig-text)]"
            />
          </label>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-3 py-2 rounded-lg border border-[var(--ig-border)] text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-3 py-2 rounded-lg bg-[var(--ig-text)] text-[var(--ig-bg-primary)] font-medium disabled:opacity-50" aria-label={saving ? "Saving" : "Save changes"}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
    </div>
  );
}
