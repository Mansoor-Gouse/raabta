# Phase 1 Spec: Core Chat Parity

## Phase Goal
Deliver high-confidence parity improvements for:
- Reply/Reactions/Edit/Delete action UX
- Typing indicator and last-seen/online coherence
- Read receipt fidelity polish

## In Scope
- `components/chat/ChannelMessageLayout.tsx`
- `components/chat/ChannelWithThreadLayout.tsx`
- `components/chat/MessageStatusTicks.tsx`
- `components/chat/CustomChannelHeader.tsx`

## 1) Message Action UX Parity

### Requirements
- Keep action set and ordering consistent across channel surfaces:
  - Main channel list messages
  - Thread messages
- Standardize action availability rules:
  - Edit/delete only for own messages
  - Reply/react for all allowed messages
- Standardize destructive confirmation behavior (delete) and disabled states.

### Acceptance
- Action menus show same order and labels in main + thread view.
- No surface-specific surprises for eligible/ineligible actions.

## 2) Typing + Presence Coherence

### Requirements
- Add explicit typing indicator presentation in message area/header layer.
- Keep online/last-seen display deterministic:
  - Online takes precedence over last-seen.
  - Last-seen shown only for 1:1 and when online false.

### Acceptance
- Typing state appears/disappears without stale linger.
- Last-seen text format is consistent across channel header states.

## 3) Read Receipts Fidelity

### Requirements
- Improve from simplified indicator to clearer outbound read-state semantics.
- Use Stream read state as source of truth.
- Ensure deterministic behavior for latest outbound message in 1:1:
  - Sent state
  - Seen state
- Preserve existing failure/retry indicators.

### Acceptance
- Latest outbound message state transitions correctly after peer read.
- No false seen state when only sent.

## Non-goals
- Forwarding and starred message features (Phase 2).
- New backend model additions unless required for selected Phase 1 scope.

## Implementation Notes
- Keep changes additive and low-risk; avoid broad UI redesign in this phase.
- Prefer unifying helper logic over duplicating state derivations across components.

