# Block/Unblock + Chat List QA Matrix

Use two real test users:
- UserA (blocker)
- UserB (blocked target)
- Optional UserC (control user to verify user-specific scope)

## Preconditions
- UserA and UserB have an existing 1:1 DM.
- UserA and UserB are both in at least one group chat.
- Push is enabled on UserA.

## A) Block/Unblock matrix

1. UserA opens 1:1 DM with UserB and taps `Block user`.
   - Expected: current chat switches to blocked placeholder immediately.
   - Expected: no full page refresh.
2. UserA opens Chats list.
   - Expected: UserB DM removed from `Messages`.
   - Expected: UserB DM appears in `Blocked` tab.
3. UserA opens `/app/channel/{dmId}` directly.
   - Expected: blocked placeholder shown, no composer.
4. UserA opens a group containing UserB.
   - Expected: group remains fully visible and usable.
5. UserA unblocks UserB in Settings blocked list.
   - Expected: blocked placeholder disappears in open DM without refresh.
   - Expected: DM returns to `Messages` and is removed from `Blocked`.

## B) User-specific (not global) scope checks

1. After UserA blocks UserB, log in as UserC.
   - Expected: UserC can still DM UserB normally.
   - Expected: UserC chat lists are not changed by UserA action.
2. Log in as UserB.
   - Expected: UserB chat list is not moved to Blocked due to UserA action.
   - Expected: UserB can continue normal flows unrelated to UserA's local block list.

## C) Push checks

1. UserB sends new message to UserA in 1:1 while blocked by UserA.
   - Expected: no push notification on UserA.
2. UserB sends message in shared group with UserA.
   - Expected: group push behavior unchanged.
3. UserA unblocks UserB and UserB sends 1:1 message again.
   - Expected: push resumes.

## D) WhatsApp-style chat list ordering + unread

1. UserB sends message to UserA in a non-top conversation.
   - Expected: conversation moves to top on UserA list without refresh.
2. UserB sends multiple messages.
   - Expected: row unread count increments accurately.
3. UserA opens the conversation.
   - Expected: unread count clears after read/mark-read.
4. Verify in both surfaces:
   - `Chats` page list
   - sidebar list in app shell

## Recording template

- Date/time:
- Build/branch:
- Tester:
- Result A (pass/fail + notes):
- Result B (pass/fail + notes):
- Result C (pass/fail + notes):
- Result D (pass/fail + notes):

