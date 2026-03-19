# Chat Module Current State Baseline

## Scope
This document captures the current implementation state of chat and adjacent messaging behaviors.

## Architecture
- **Runtime stack**: Stream Chat SDK (`stream-chat-react`) with Next.js frontend components.
- **Core surfaces**:
  - `app/app/chats/page.tsx` (tabs, search shell, blocked/messages split)
  - `components/chat/ChannelList.tsx` (channel query/merge/sort/filter/unread row UI)
  - `app/app/channel/[channelId]/page.tsx` (channel binding + blocked guard)
  - `components/chat/ChannelWithThreadLayout.tsx` (message pane + thread pane + options)
  - `components/chat/ChannelMessageLayout.tsx` (message list, read marker logic, input mount)
  - `components/chat/CustomMessageInputWithRichMedia.tsx` (composer extensions)

## Backend/API Contracts Used by Chat
- `app/api/stream-token/route.ts` (Stream auth token for client)
- `app/api/channels/ensure-user/route.ts` (resolve target users before DM/group member operations)
- `app/api/search/route.ts` (user search for new chat/group/member add)
- `app/api/me/block/route.ts` + `app/api/me/block/[userId]/route.ts` (pair-specific block/unblock)
- `app/api/webhooks/stream/route.ts` (push dispatch + blocked DM suppression)

## Feature Inventory

### Existing (strong)
- Channel list real-time-ish refresh + recency sorting + unread badge rows.
- Archive/mute actions on channel rows.
- Reply/edit/delete/react actions exposed through Stream message actions.
- Channel-level search and thread panel.
- Basic online/last-seen in 1:1 header.
- Pair-specific block/unblock with blocked 1:1 guard screen.

### Partial
- Read receipts are simplified and not fully WhatsApp-like per-message semantics.
- Typing experience relies mainly on SDK defaults; app-specific UX is minimal.
- Action UX consistency (ordering/confirmation/visibility) needs parity polish.

### Missing (for full parity)
- Forward message flow.
- Starred messages flow.
- Advanced delivery/read state polish and consistency in all views.

## Constraints and Notes
- Chat messaging CRUD is mostly Stream-driven; app has limited custom message APIs.
- Group authorization boundaries primarily rely on Stream permissions.
- Current docs include QA matrix for block/chat list at `docs/BLOCK_UNBLOCK_CHATLIST_QA_MATRIX.md`.

