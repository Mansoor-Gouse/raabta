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
      { name?: string; image?: string; mediaUrl: string; sessionIndex: number; viewedAllByMe?: boolean }
    >();
    sessions.forEach((s, i) => {
      const lastStatus = s.statuses[s.statuses.length - 1];
      const statusIds = new Set(s.statuses.map((st) => st._id));
      const statusItems = items.filter((it) => statusIds.has(it._id));
      const viewedAllByMe =
        statusIds.size > 0 &&
        statusItems.every((it) => it.viewedByMe === true);
      map.set(s.userId, {
        name: s.userName,
        image: s.userImage,
        mediaUrl: lastStatus?.mediaUrl || "",
        sessionIndex: i,
        viewedAllByMe: !!viewedAllByMe,
      });
    });
    return map;
  }, [sessions, items, meId]);

  const hasOwnStory = meId != null && byUser.has(meId);
  const myStoryInfo = meId ? byUser.get(meId) : undefined;
  const otherUsers = useMemo(
    () =>
      Array.from(byUser.entries()).filter(([id]) => id !== meId),
    [byUser, meId]
  );
  const myName = me?.fullName || me?.name || "You";

  const storyRingClass = "w-[66px] h-[66px] rounded-full p-[2.5px] flex items-center justify-center";
  const storyInnerClass = "w-full h-full rounded-full bg-[var(--ig-bg-primary)] p-[2px] flex items-center justify-center overflow-hidden box-border";
  const storyImgClass = "w-full h-full rounded-full object-cover";

  const yourStoryViewedAll = myStoryInfo?.viewedAllByMe ?? false;
  const yourStoryTile = (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <div className="relative">
        <div
          className={storyRingClass}
          style={{
            background: hasOwnStory && yourStoryViewedAll
              ? "var(--ig-border)"
              : "var(--ig-story-ring-gradient)",
            boxSizing: "border-box",
          }}
        >
          <div className={storyInnerClass}>
            {hasOwnStory && myStoryInfo?.mediaUrl ? (
              <img
                src={myStoryInfo.mediaUrl}
                alt=""
                className={storyImgClass}
              />
            ) : me?.profileImage || me?.image ? (
              <img
                src={me.profileImage || me.image || ""}
                alt=""
                className={storyImgClass}
              />
            ) : (
              <span className="text-2xl font-medium text-[var(--ig-text-secondary)]">
                {myName?.charAt(0)?.toUpperCase() || "?"}
              </span>
            )}
          </div>
        </div>
        {!hasOwnStory && (
          <span
            className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[var(--ig-link)] border-2 border-[var(--ig-bg-primary)] flex items-center justify-center text-white text-sm font-bold leading-none"
            aria-hidden
          >
            +
          </span>
        )}
      </div>
      <span className="text-xs text-[var(--ig-text)] max-w-[64px] truncate block text-center">
        Your story
      </span>
    </div>
  );

  return (
    <>
      <div className="shrink-0 overflow-x-auto border-b border-[var(--ig-border-light)] bg-[var(--ig-bg-primary)] no-scrollbar">
        <div className="flex gap-4 px-4 py-3 min-h-[104px] items-end">
          {/* Your story: view own stories if any, else go to add flow */}
          {hasOwnStory ? (
            <button
              type="button"
              onClick={() => setViewerSessionIndex(0)}
              className="flex flex-col items-center gap-1 shrink-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-link)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ig-bg-primary)] rounded-full touch-manipulation active:scale-[0.97] transition-transform"
              aria-label="View your story"
            >
              {yourStoryTile}
            </button>
          ) : (
            <Link
              href="/app/status/new"
              className="flex flex-col items-center gap-1 shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-link)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ig-bg-primary)] touch-manipulation active:scale-[0.97] transition-transform"
              aria-label="Add to your story"
            >
              {yourStoryTile}
            </Link>
          )}

          {/* Other stories - open viewer; gray ring if viewed all by me */}
          {otherUsers.map(([userId, info]) => (
            <button
              key={userId}
              type="button"
              onClick={() => setViewerSessionIndex(info.sessionIndex)}
              className="flex flex-col items-center gap-1 shrink-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-link)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ig-bg-primary)] rounded-full touch-manipulation active:scale-[0.97] transition-transform"
            >
              <div
                className={storyRingClass}
                style={{
                  background: info.viewedAllByMe
                    ? "var(--ig-border)"
                    : "var(--ig-story-ring-gradient)",
                  boxSizing: "border-box",
                }}
              >
                <div className={storyInnerClass}>
                  {info.mediaUrl ? (
                    <img
                      src={info.mediaUrl}
                      alt=""
                      className={storyImgClass}
                    />
                  ) : info.image ? (
                    <img
                      src={info.image}
                      alt=""
                      className={storyImgClass}
                    />
                  ) : (
                    <span className="text-xl font-medium text-[var(--ig-text-secondary)]">
                      {info.name?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs text-[var(--ig-text)] max-w-[64px] truncate block text-center">
                {info.name || "Story"}
              </span>
            </button>
          ))}
        </div>
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
