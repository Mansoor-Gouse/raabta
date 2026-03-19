# Chat List Preview/Time/Signals QA

Target: validate chat-list correctness for recent message preview, time display, and signaling indicators.

## Scope

- `components/chat/ChannelList.tsx`
- Chats page + sidebar channel list behavior

## Preconditions

- At least 2 users (`A`, `B`) and one group (`A`, `B`, `C`)
- At least one new/low-activity channel (to test fallback times)
- At least one channel with media/file messages

## Recent Message Preview

- [ ] Text message appears under chat name with latest text.
- [ ] Latest message is shown even after rapid send bursts.
- [ ] If latest message is image-only, preview shows `Photo`.
- [ ] If latest message is file/attachment-only, preview shows `Attachment`.
- [ ] If current user sent latest attachment, preview shows:
  - [ ] `You sent a photo` (image)
  - [ ] `You sent an attachment` (non-image)
- [ ] If current user sent latest text, preview shows `You: <text>`.

## Last Message Time

- [ ] Time appears for active channels with recent messages.
- [ ] Time updates after new incoming message.
- [ ] Time updates after self-sent message.
- [ ] Channels with missing message timestamp still show fallback time when available.
- [ ] Newly created channel without message uses safe fallback (no blank/invalid time crash).

## Mentions / Unread / Muted Signaling

- [ ] Group mention indicator appears when `A` is mentioned by `B`.
- [ ] Mention chip (`@you`) is shown on matching group row.
- [ ] Mention detection works via metadata-backed mentions (not only text parsing).
- [ ] Unread dot and count increment on incoming messages.
- [ ] Unread count clears on mark-read and returns on mark-unread.
- [ ] Muted row shows mute icon and muted unread badge styling.

## Ordering + Recency Integrity

- [ ] Most recent chat moves to top after new message (within pinned/unpinned section rules).
- [ ] Pinned chats remain above non-pinned chats.
- [ ] Within pinned and within all chats sections, ordering is recency-first.

## Edge/Regression Checks

- [ ] No page refresh required for preview/time updates.
- [ ] No console errors during normal list interactions.
- [ ] Blocked tab still only contains blocked 1:1 channels.
- [ ] Archived/unarchived list behavior unaffected by preview/time changes.

## Exit Criteria

- All checklist items pass for:
  - [ ] 1:1 channels
  - [ ] group channels
  - [ ] mixed media/text usage
