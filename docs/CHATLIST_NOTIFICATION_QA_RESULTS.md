# Chat List + Notification QA Results

## Validation Context
- Date: 2026-03-19
- Scope: WhatsApp-style in-app indicators + push tuning
- Build checks:
  - `npm run typecheck` -> PASS
  - Changed-file lints -> PASS

## Matrix

### A) DM indicators
- New DM from non-top chat moves row to top: **Pending manual verification**
- Unread count increments on repeated DM messages: **Pending manual verification**
- Opening DM clears unread indicators: **Pending manual verification**

### B) Group indicators
- New group message updates unread row treatment: **Pending manual verification**
- Mention marker appears for `@myId` / `@myName`: **Pending manual verification**

### C) Push behavior
- 1:1 blocked sender -> no push: **Pending manual verification**
- 1:1 unblocked sender -> push sent: **Pending manual verification**
- Group push formatting (`sender in group`) works: **Pending manual verification**
- Rapid burst coalescing suppresses duplicates per recipient/channel (~8s): **Pending manual verification**

### D) Surface parity
- Chats page and sidebar show consistent unread treatment: **Pending manual verification**

## Notes
- Code-level implementation is complete for the planned changes.
- Final release signoff requires a real two-user manual run (or browser automation with two sessions and push-capable environment).

