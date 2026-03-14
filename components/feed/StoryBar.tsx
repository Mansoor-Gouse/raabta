"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { StoryViewer, type StorySession, type StatusItem } from "@/components/status/StoryViewer";

type RawStatusItem = {
  _id: string;
  userId: string | { _id: string; name?: string; image?: string };
  mediaUrl: string;
  type: "image" | "video";
  createdAt?: string;
  viewedByMe?: boolean;
  caption?: string;
  textOverlays?: Array<{
    id: string;
    text: string;
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor?: string;
    fontWeight?: string;
    textAlign?: string;
    rotation?: number;
    scale?: number;
  }>;
  mediaTransform?: { scale: number; translateX: number; translateY: number };
};

type Me = { _id: string; fullName?: string; name?: string; profileImage?: string; image?: string } | null;

function timeAgo(date: string | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const s = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return d.toLocaleDateString();
}

function buildSessions(
  items: RawStatusItem[],
  me: Me
): StorySession[] {
  const byUser = new Map<
    string,
    { name?: string; image?: string; statuses: RawStatusItem[] }
  >();
  for (const s of items) {
    const id =
      typeof s.userId === "object"
        ? String((s.userId as { _id: string })._id)
        : String(s.userId);
    if (!byUser.has(id)) {
      byUser.set(id, {
        name:
          typeof s.userId === "object"
            ? (s.userId as { name?: string }).name
            : undefined,
        image:
          typeof s.userId === "object"
            ? (s.userId as { image?: string }).image
            : undefined,
        statuses: [],
      });
    }
    byUser.get(id)!.statuses.push(s);
  }

  const sessions: StorySession[] = [];
  const meId = me?._id ? String(me._id) : null;

  if (meId && byUser.has(meId)) {
    const my = byUser.get(meId)!;
    const statuses = [...my.statuses]
      .sort(
        (a, b) =>
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime()
      )
      .map((s) => ({
        _id: s._id,
        mediaUrl: s.mediaUrl,
        type: s.type,
        caption: s.caption,
        textOverlays: s.textOverlays,
        mediaTransform: s.mediaTransform,
      })) as StatusItem[];
    sessions.push({
      userId: meId,
      userName: me?.fullName || me?.name || "You",
      userImage: me?.profileImage || me?.image,
      statuses,
    });
  }

  for (const [userId, info] of byUser.entries()) {
    if (userId === meId) continue;
    const statuses = [...info.statuses]
      .sort(
        (a, b) =>
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime()
      )
      .map((s) => ({
        _id: s._id,
        mediaUrl: s.mediaUrl,
        type: s.type,
        caption: s.caption,
        textOverlays: s.textOverlays,
        mediaTransform: s.mediaTransform,
      })) as StatusItem[];
    sessions.push({
      userId,
      userName: info.name,
      userImage: info.image,
      statuses,
    });
  }

  return sessions;
}

export function StoryBar() {
  const [items, setItems] = useState<RawStatusItem[]>([]);
  const [me, setMe] = useState<Me>(null);
  const [viewerSessionIndex, setViewerSessionIndex] = useState<number | null>(null);

  const fetchStatus = useCallback(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((data) => {
        const list = (data.status || []) as RawStatusItem[];
        setItems(list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => setMe(data._id ? data : null))
      .catch(() => {});
  }, []);

  const sessions = useMemo(() => buildSessions(items, me), [items, me]);
  const meId = me?._id ? String(me._id) : null;

  const byUser = useMemo(() => {
    const map = new Map<
      string,
      { name?: string; image?: string; mediaUrl: string; sessionIndex: number; viewedAllByMe?: boolean; lastCreatedAt?: string }
    >();
    sessions.forEach((s, i) => {
      const lastStatus = s.statuses[s.statuses.length - 1];
      const statusIds = new Set(s.statuses.map((st) => st._id));
      const statusItems = items.filter((it) => statusIds.has(it._id));
      const viewedAllByMe =
        statusIds.size > 0 &&
        statusItems.every((it) => it.viewedByMe === true);
      const lastRaw = lastStatus ? items.find((it) => it._id === lastStatus._id) : undefined;
      map.set(s.userId, {
        name: s.userName,
        image: s.userImage,
        mediaUrl: lastStatus?.mediaUrl || "",
        sessionIndex: i,
        viewedAllByMe: !!viewedAllByMe,
        lastCreatedAt: lastRaw?.createdAt,
      });
    });
    return map;
  }, [sessions, items, meId]);

  const hasOwnStory = meId != null && byUser.has(meId);
  const myStoryInfo = meId ? byUser.get(meId) : undefined;
  const otherUsers = useMemo(() => {
    const entries = Array.from(byUser.entries()).filter(([id]) => id !== meId);
    return entries.sort((a, b) => {
      const tA = a[1].lastCreatedAt ? new Date(a[1].lastCreatedAt).getTime() : 0;
      const tB = b[1].lastCreatedAt ? new Date(b[1].lastCreatedAt).getTime() : 0;
      return tB - tA;
    });
  }, [byUser, meId]);
  const myName = me?.fullName || me?.name || "You";

  const ringSizeClass = "w-12 h-12 rounded-lg p-[2px] flex items-center justify-center shrink-0";
  const innerClass = "w-full h-full rounded-[6px] bg-[var(--ig-bg-primary)] flex items-center justify-center overflow-hidden";
  const imgClass = "w-full h-full rounded-[6px] object-cover";

  const yourStoryViewedAll = myStoryInfo?.viewedAllByMe ?? false;

  const renderAvatar = (
    mediaUrl: string | undefined,
    image: string | undefined,
    name: string | undefined,
    fallbackChar: string
  ) => (
    <>
      {mediaUrl ? (
        <img src={mediaUrl} alt="" className={imgClass} />
      ) : image ? (
        <img src={image} alt="" className={imgClass} />
      ) : (
        <span className="text-lg font-medium text-[var(--ig-text-secondary)]">
          {fallbackChar}
        </span>
      )}
    </>
  );

  return (
    <>
      <div className="shrink-0 px-4 py-3">
        <ul className="flex flex-col gap-0">
          {/* Your story row */}
          <li>
            {hasOwnStory ? (
              <button
                type="button"
                onClick={() => setViewerSessionIndex(0)}
                className="w-full flex items-center gap-3 py-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-link)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ig-bg-primary)] touch-manipulation active:bg-[var(--ig-border-light)]/50 transition-colors text-left"
                aria-label="View your story"
              >
                <div
                  className={ringSizeClass}
                  style={{
                    background: yourStoryViewedAll ? "var(--ig-border)" : "var(--ig-story-ring-gradient)",
                    boxSizing: "border-box",
                  }}
                >
                  <div className={innerClass}>
                    {renderAvatar(myStoryInfo?.mediaUrl, me?.profileImage || me?.image, myName, myName?.charAt(0)?.toUpperCase() || "?")}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-[var(--ig-text)] truncate">Your story</p>
                  <p className="text-xs text-[var(--ig-text-secondary)]">{timeAgo(myStoryInfo?.lastCreatedAt) || "Add story"}</p>
                </div>
              </button>
            ) : (
              <Link
                href="/app/status/new"
                className="w-full flex items-center gap-3 py-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-link)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ig-bg-primary)] touch-manipulation active:bg-[var(--ig-border-light)]/50 transition-colors text-left"
                aria-label="Add to your story"
              >
                <div
                  className={ringSizeClass}
                  style={{ background: "var(--ig-story-ring-gradient)", boxSizing: "border-box" }}
                >
                  <div className={`${innerClass} relative`}>
                    {renderAvatar(undefined, me?.profileImage || me?.image, myName, myName?.charAt(0)?.toUpperCase() || "?")}
                    <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-white border-2 border-[var(--ig-bg-primary)] flex items-center justify-center text-black shrink-0" aria-hidden>
                      <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                        <path d="M6 2v8M2 6h8" />
                      </svg>
                    </span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-[var(--ig-text)] truncate">Your story</p>
                  <p className="text-xs text-[var(--ig-text-secondary)]">Add story</p>
                </div>
              </Link>
            )}
          </li>

          {/* Other users' stories */}
          {otherUsers.map(([userId, info]) => (
            <li key={userId}>
              <button
                type="button"
                onClick={() => setViewerSessionIndex(info.sessionIndex)}
                className="w-full flex items-center gap-3 py-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-link)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ig-bg-primary)] touch-manipulation active:bg-[var(--ig-border-light)]/50 transition-colors text-left"
              >
                <div
                  className={ringSizeClass}
                  style={{
                    background: info.viewedAllByMe ? "var(--ig-border)" : "var(--ig-story-ring-gradient)",
                    boxSizing: "border-box",
                  }}
                >
                  <div className={innerClass}>
                    {renderAvatar(info.mediaUrl, info.image, info.name, info.name?.charAt(0)?.toUpperCase() || "?")}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-[var(--ig-text)] truncate">{info.name || "Story"}</p>
                  <p className="text-xs text-[var(--ig-text-secondary)]">{timeAgo(info.lastCreatedAt)}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {viewerSessionIndex !== null && sessions.length > 0 && (
        <StoryViewer
          sessions={sessions}
          initialSessionIndex={viewerSessionIndex}
          initialStatusIndex={0}
          onClose={() => {
            setViewerSessionIndex(null);
            setTimeout(() => fetchStatus(), 400);
          }}
          currentUserId={meId ?? undefined}
          onStatusDeleted={(statusId) =>
            setItems((prev) => prev.filter((s) => s._id !== statusId))
          }
        />
      )}
    </>
  );
}
