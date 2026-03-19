# Chat List Indicator and Push Rules

## In-app indicator rules
- **Unread count**: show per-row unread count; cap at `99+`.
- **Unread emphasis**: unread rows use stronger typography for name/preview/time.
- **Unread dot**: show a small dot marker when row is unread (in addition to count).
- **Mention marker**: for group rows, show `@` marker when latest message mentions current user.
- **Blocked rows**: blocked 1:1 chats are excluded from main `Messages` list and shown only in `Blocked`.
- **Archived rows**: archived rows are shown only in archived mode and retain unread state.
- **Muted rows**: muted rows still track unread counts in list; push behavior can be throttled server-side.

## Push rules
- **DM push suppression**: if recipient blocked sender in 1:1, skip push.
- **Group title/body format**: title includes group/channel context and sender identity.
- **DM title/body format**: title is sender name; body is text preview fallback.
- **Anti-noise coalescing**: suppress duplicate rapid pushes for same recipient/channel within a short cooldown.

## Transition correctness
- `message.new` updates list ordering and unread indicators.
- `notification.mark_read` clears indicators.
- `notification.mark_unread` re-applies indicators.

