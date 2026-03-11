"use client";

import {
  AudioRecorder,
  MessageInputFlat,
  StartRecordingAudioButton,
  useMessageInputContext,
} from "stream-chat-react";
import { RichMediaBar } from "./RichMediaBar";
import { useViewOnce } from "./ViewOnceContext";

/**
 * Custom input: RichMediaBar (photo/file), voice button, view-once toggle, and message input.
 * When recording, shows Stream's AudioRecorder UI.
 */
export function CustomMessageInputWithRichMedia() {
  const { viewOnce, setViewOnce } = useViewOnce();
  const { recordingController } = useMessageInputContext();

  const recordingState = recordingController?.recordingState;
  const recordingEnabled =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    !!recordingController?.recorder;

  if (recordingState) {
    return <AudioRecorder />;
  }

  return (
    <div className="custom-message-input flex items-end gap-1 w-full">
      <RichMediaBar />
      {recordingEnabled && (
        <StartRecordingAudioButton
          className="shrink-0 p-2 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center touch-manipulation text-[var(--ig-text-secondary)] hover:bg-[var(--ig-border-light)]"
          aria-label="Record voice message"
          onClick={() => recordingController?.recorder?.start()}
        />
      )}
      <button
        type="button"
        onClick={() => setViewOnce((v) => !v)}
        className={`shrink-0 p-2 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center touch-manipulation transition-colors ${
          viewOnce
            ? "bg-[var(--ig-text)] text-[var(--ig-bg-primary)]"
            : "text-[var(--ig-text-secondary)] hover:bg-[var(--ig-border-light)]"
        }`}
        aria-pressed={viewOnce}
        aria-label={viewOnce ? "View once on (next message)" : "Send as view once"}
        title={viewOnce ? "Next message is view once" : "Send as view once"}
      >
        <ViewOnceIcon />
      </button>
      <div className="flex-1 min-w-0">
        <MessageInputFlat />
      </div>
    </div>
  );
}

function ViewOnceIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}
