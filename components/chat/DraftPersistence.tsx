"use client";

import { useEffect, useRef } from "react";
import { useChannelStateContext, useMessageInputContext } from "stream-chat-react";
import { setDraft } from "@/lib/draftStorage";

const DEBOUNCE_MS = 400;

/**
 * Saves the main channel message input text to localStorage (debounced and on unmount).
 * Only runs when channel.cid is set; thread reply input is out of scope.
 */
export function DraftPersistence() {
  const { channel } = useChannelStateContext();
  const { text } = useMessageInputContext();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cid = channel?.cid;
    if (!cid) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setDraft(cid, text ?? "");
    }, DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setDraft(cid, text ?? "");
    };
  }, [channel?.cid, text]);

  return null;
}

