declare module "@stream-io/video-react-sdk" {
  import type { ReactNode, ComponentType } from "react";
  export const StreamCall: (props: { call: unknown; children: ReactNode; key?: string }) => JSX.Element;
  export function useCalls(): { cid: string; ringing?: boolean }[];
  export function useStreamVideoClient(): { call: (type: string, id: string) => { getOrCreate: (opts: unknown) => Promise<unknown> } } | null | undefined;
  export const RingingCall: ComponentType<Record<string, unknown>>;
  export const SpeakerLayout: ComponentType<Record<string, unknown>>;
  export const ToggleAudioPublishingButton: ComponentType<Record<string, unknown>>;
  export const ToggleVideoPublishingButton: ComponentType<Record<string, unknown>>;
  export const ScreenShareButton: ComponentType<Record<string, unknown>>;
  export const CancelCallButton: ComponentType<Record<string, unknown>>;
  export function useCallStateHooks(): {
    useCallCallingState: () => unknown;
    useCallCustomData: () => unknown;
  };
  export const CallingState: { RINGING: string; JOINED: string; LEFT: string; [k: string]: string };
  export const SpeakingWhileMutedNotification: ComponentType<Record<string, unknown>>;
}
