"use client";

import {
  StreamCall,
  useCalls,
  RingingCall,
  SpeakerLayout,
  ToggleAudioPublishingButton,
  ToggleVideoPublishingButton,
  ScreenShareButton,
  CancelCallButton,
  useCallStateHooks,
  CallingState,
  SpeakingWhileMutedNotification,
} from "@stream-io/video-react-sdk";
import { useChatContext } from "stream-chat-react";

export function CallPanel() {
  const calls = useCalls().filter((c: { ringing?: boolean }) => c.ringing);
  const { channel: activeChannel } = useChatContext();

  if (calls.length === 0) return null;

  return (
    <>
      {calls.map((call) => (
        <StreamCall call={call} key={call.cid}>
          <CallPanelInner
            activeChannelCid={activeChannel?.cid}
            call={call}
          />
        </StreamCall>
      ))}
    </>
  );
}

function CallPanelInner({
  activeChannelCid,
  call,
}: {
  activeChannelCid: string | undefined;
  call: { cid: string; ringing?: boolean };
}) {
  const { useCallCallingState, useCallCustomData } = useCallStateHooks();
  const callingState = useCallCallingState();
  const customData = useCallCustomData() as { channelCid?: string } | undefined;
  const channelCid = customData?.channelCid;
  const isActiveChannel = activeChannelCid === channelCid;

  if (callingState === CallingState.RINGING && !isActiveChannel) {
    return null;
  }

  if (
    callingState === CallingState.RINGING ||
    callingState === CallingState.JOINING
  ) {
    return (
      <div
        className="fixed left-3 right-3 bottom-3 sm:left-auto sm:right-4 sm:bottom-4 z-50 rounded-xl shadow-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 min-w-0 sm:min-w-[280px] max-w-full"
        style={{ bottom: "calc(0.75rem + var(--safe-area-inset-bottom))" }}
      >
        <RingingCall />
      </div>
    );
  }

  if (callingState === CallingState.JOINED) {
    return (
      <div
        className="fixed left-3 right-3 bottom-3 sm:left-auto sm:right-4 sm:bottom-4 z-50 rounded-xl shadow-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 overflow-hidden w-[calc(100vw-1.5rem)] sm:w-auto sm:min-w-[320px] min-h-[200px] sm:min-h-[240px] max-w-full"
        style={{ bottom: "calc(0.75rem + var(--safe-area-inset-bottom))" }}
      >
        <SpeakerLayout />
        <div className="flex items-center justify-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 min-h-[52px]">
          <ScreenShareButton />
          <SpeakingWhileMutedNotification>
            <ToggleAudioPublishingButton />
          </SpeakingWhileMutedNotification>
          <ToggleVideoPublishingButton />
          <CancelCallButton />
        </div>
      </div>
    );
  }

  return null;
}
