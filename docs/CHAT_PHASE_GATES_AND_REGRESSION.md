# Chat Phase Gates and Regression Checklist

## Gate Format
Each phase must satisfy:
- Entry criteria
- Implementation checks
- Exit criteria

---

## Phase 1 Gate (Core parity polish)

### Entry criteria
- Baseline and Phase 1 spec docs approved.
- Existing block/unblock + chat-list matrix available.

### Implementation checks
- Message action UX consistency in main/thread views.
- Typing indicator visible and stable.
- Last-seen/online format is deterministic.
- Read receipt behavior for latest outbound 1:1 message is accurate.

### Exit criteria
- No regressions in:
  - Send/edit/delete/reply/react flows
  - Blocked guard behavior
  - Chat list recency/unread behavior
- `npm run typecheck` passes.
- Touched-file lint checks clean.

---

## Phase 2 Gate (Forward + Starred)

### Entry criteria
- Phase 1 complete and stable.
- Phase 2 design doc approved (storage + API choices).

### Implementation checks
- Forward flow from message action to target picker to successful send.
- Forward metadata renders clearly on destination message.
- Star/unstar works per-user.
- Starred list loads quickly and paginates reliably.

### Exit criteria
- User-specific star semantics verified (no cross-user leakage).
- No message send regression from forwarding enhancements.
- API auth and validation checks pass manually.

---

## Phase 3 Gate (Advanced parity + hardening)

### Entry criteria
- Phase 2 complete and stable.

### Implementation checks
- Conversation-level parity polish (pin/archive/mute/unread marker details).
- Offline queue and reconnect convergence checks.
- Telemetry/observability signals for key state transitions.

### Exit criteria
- Full QA matrix pass across DM/group scenarios.
- Release runbook sign-off.

---

## Regression Checklist (run each phase)
- 1:1 DM send/receive/read.
- Group send/receive/read.
- Block/unblock pair-specific behavior.
- Push suppression for blocked DM only.
- Chat list top-order on new message.
- Per-row unread badges update correctly.
- No full-page refresh required for key state transitions.

