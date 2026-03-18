"use client";

import {
  AudioRecorder,
  MessageInputFlat,
  StartRecordingAudioButton,
  useMessageInputContext,
} from "stream-chat-react";
import { RichMediaBar } from "./RichMediaBar";
import { DraftPersistence } from "./DraftPersistence";

/**
 * Custom input: RichMediaBar (photo/file), voice button, and message input.
 * When recording, shows Stream's AudioRecorder UI.
 */
export function CustomMessageInputWithRichMedia() {
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
      <DraftPersistence />
      <RichMediaBar />
      {recordingEnabled && (
        <StartRecordingAudioButton
          className="shrink-0 p-2 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center touch-manipulation text-[var(--ig-text-secondary)] hover:bg-[var(--ig-border-light)]"
          aria-label="Record voice message"
          onClick={() => recordingController?.recorder?.start()}
        />
      )}
      <div className="flex-1 min-w-0">
        <MessageInputFlat />
      </div>
    </div>
  );
}
