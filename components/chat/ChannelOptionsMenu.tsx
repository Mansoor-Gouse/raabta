"use client";

import { useState } from "react";
import { useChannelStateContext, useChatContext } from "stream-chat-react";
import { useGroupMembersOpen } from "./GroupMembersOpenContext";

export function ChannelOptionsMenu() {
  const { channel } = useChannelStateContext();
  const { client } = useChatContext();
  const [open, setOpen] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const groupMembersOpen = useGroupMembersOpen();

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

  const channelData = (channel?.data || {}) as { name?: string; image?: string };
  const currentGroupName = channelData.name ?? "";
  const currentGroupImage = channelData.image ?? "";

  return (
    <div className="relative shrink-0">
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
        <div
          className="fixed inset-0 z-40 flex items-end bg-black/40"
          onClick={() => setOpen(false)}
          aria-label="Channel options drawer"
        >
          <div
            className="w-full max-h-[70vh] bg-[var(--ig-bg-primary)] border-t border-[var(--ig-border)] rounded-t-2xl shadow-xl p-3 space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-[var(--ig-border)] mx-auto mb-2" aria-hidden />
            {isGroup && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  groupMembersOpen?.setOpen(true);
                }}
                className="w-full text-left px-3 py-2 text-sm text-[var(--ig-text)] hover:bg-[var(--ig-border-light)] rounded-lg"
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
                className="w-full text-left px-3 py-2 text-sm text-[var(--ig-text)] hover:bg-[var(--ig-border-light)] rounded-lg"
              >
                Edit group
              </button>
            )}
            {isGroup && <div className="border-t border-[var(--ig-border)] my-1" />}
            {otherUserId && (
              <button
                type="button"
                onClick={handleBlock}
                className="w-full text-left px-3 py-2 text-sm text-[var(--ig-error)] hover:bg-[var(--ig-border-light)] rounded-lg"
              >
                Block user
              </button>
            )}
            <div className="border-t border-[var(--ig-border)] my-1" />
            <div className="border-t border-[var(--ig-border)] my-1" />
            <button
              type="button"
              onClick={handleReportChannel}
              className="w-full text-left px-3 py-2 text-sm text-[var(--ig-text)] hover:bg-[var(--ig-border-light)] rounded-lg"
            >
              Report chat
            </button>
          </div>
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/posts/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setUploadError(data?.error || "Failed to upload image");
        return;
      }
      const data = (await res.json()) as { mediaUrls?: string[] };
      const url = data.mediaUrls?.[0];
      if (url) {
        setImage(url);
      } else {
        setUploadError("Upload succeeded but no URL returned");
      }
    } catch {
      setUploadError("Failed to upload image");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

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
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-[var(--ig-border-light)] flex items-center justify-center">
              {image ? (
                <img src={image} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-semibold text-[var(--ig-text-secondary)]">
                  {(name || "G")[0].toUpperCase()}
                </span>
              )}
            </div>
            <label className="text-xs font-medium text-[var(--ig-link)] cursor-pointer">
              {uploading ? "Uploading…" : "Change image"}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />
            </label>
            {uploadError && (
              <p className="text-xs text-[var(--ig-error)] text-center max-w-xs">{uploadError}</p>
            )}
          </div>
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
