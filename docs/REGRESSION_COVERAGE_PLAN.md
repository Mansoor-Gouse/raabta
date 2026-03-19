# Regression Coverage Plan

This repo currently has no dedicated automated test runner configured in `package.json`.
Until a test framework is introduced, use this as the minimum regression gate.

## API contract checks

### `/api/me/block` POST
- Input: `{ userId: "<target>" }`
- Expect:
  - creates/keeps only pair `{ userId: session.userId, blockedUserId: target }`
  - does not affect other users

### `/api/me/block/[userId]` DELETE
- Input: route param target user id
- Expect:
  - removes only `{ userId: session.userId, blockedUserId: target }`
  - does not modify third-party pairs

### `/api/me/block` GET
- Expect:
  - returns only blocked ids for current session user

## Webhook checks (`/api/webhooks/stream`)
- 1:1 `message.new` where recipient blocked sender:
  - expect push skipped.
- 1:1 `message.new` where recipient did not block sender:
  - expect push sent.
- group channel `message.new`:
  - expect push behavior unchanged by block pair.

## UI checks
- Block/unblock event dispatch updates:
  - `components/chat/ChannelOptionsMenu.tsx`
  - `components/settings/BlockedList.tsx`
- Runtime guard:
  - `app/app/channel/[channelId]/page.tsx`
- List filtering + ordering + unread:
  - `components/chat/ChannelList.tsx`
- New DM blocked prevention:
  - `app/app/new/page.tsx`

## Promotion gate
- Run `docs/BLOCK_UNBLOCK_CHATLIST_QA_MATRIX.md` fully.
- Confirm no new lint/type errors in touched files.

