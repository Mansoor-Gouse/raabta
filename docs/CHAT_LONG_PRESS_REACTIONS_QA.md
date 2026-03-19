# Long-Press + Reactions QA Checklist

This checklist validates WhatsApp-like core message interaction parity for:

- Main channel message list
- Thread panel message list
- 1:1 and group channels
- Mobile touch and desktop right-click/keyboard paths

## Preconditions

- Test with at least 2 users (`A`, `B`) and one group with 3+ members.
- Ensure both users can send messages in:
  - one 1:1 DM
  - one group chat
- Use one thread with at least 2 replies.

## Core Long-Press Behaviors

- [ ] Long-press on a normal message opens action sheet.
- [ ] Right-click on desktop opens action sheet.
- [ ] Tapping outside sheet closes it.
- [ ] `Esc` closes sheet on desktop.
- [ ] Opening sheet provides subtle feedback (press/haptic where supported).

## Action Visibility / Ownership Rules

- [ ] Own message shows `Delete message`.
- [ ] Other user's message shows `Report message`.
- [ ] Own message does not show `Report message`.
- [ ] Other user's message does not show `Delete message`.
- [ ] View-once restricted state does not expose invalid actions.

## Reaction Quick Actions (Sheet)

- [ ] Emoji row appears for reaction-eligible messages.
- [ ] Tapping an emoji adds reaction.
- [ ] Tapping the same emoji again removes reaction.
- [ ] Selected reaction chip styling appears for own selected reactions.
- [ ] Reaction updates propagate in real time to both users.

## Reaction Summary Bar (Bubble)

- [ ] Summary bar appears when message has one or more reactions.
- [ ] Each reaction chip shows emoji + count.
- [ ] Count increments/decrements correctly across users.
- [ ] Tapping summary chip toggles own reaction.
- [ ] Selected-state style appears on chips user reacted to.

## Forward / Star from Long-Press

- [ ] `Forward` opens target picker and sends forwarded message.
- [ ] Forwarded message renders with forwarded indicator.
- [ ] `Star` stores message and appears in Starred page.
- [ ] Unstar action works from message menu where applicable.
- [ ] Starred entry link opens correct channel (team/messaging aware).

## Thread Parity

- [ ] In thread panel, long-press opens same sheet as main chat.
- [ ] In thread panel, reactions work (add/remove/toggle).
- [ ] In thread panel, forward/star actions work.
- [ ] In thread panel, reaction summary bar behavior matches main chat.

## Stability / Regression Checks

- [ ] No page refresh occurs during long-press actions.
- [ ] No duplicate reaction operations on rapid tapping.
- [ ] No console errors for normal action paths.
- [ ] Typecheck and lints remain clean after changes.

## Exit Criteria

- All checks pass in:
  - [ ] 1:1 DM
  - [ ] Group chat
  - [ ] Thread panel
- Any failing item is linked to a fix task before release.
