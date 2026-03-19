# Chat Implementation Queue (Step-by-step + File Ownership)

## Phase 1 Queue (selected priority)

### Step 1: Action UX parity normalization
- **Files**
  - `components/chat/ChannelMessageLayout.tsx`
  - `components/chat/ChannelWithThreadLayout.tsx`
- **Owner area**: Chat UI components
- **Output**
  - Unified message action order and visibility rules
  - Consistent delete/edit affordances

### Step 2: Typing indicator presentation
- **Files**
  - `components/chat/ChannelMessageLayout.tsx`
  - `components/chat/CustomChannelHeader.tsx`
- **Owner area**: Chat presence/status UI
- **Output**
  - Explicit typing indicator in-chat/header
  - Deterministic hide/show behavior

### Step 3: Last-seen/online coherence pass
- **Files**
  - `components/chat/CustomChannelHeader.tsx`
- **Owner area**: Presence rendering logic
- **Output**
  - Online precedence
  - Unified last-seen format/fallback

### Step 4: Read receipt fidelity update
- **Files**
  - `components/chat/ChannelMessageLayout.tsx`
  - `components/chat/MessageStatusTicks.tsx`
- **Owner area**: Message state visualization
- **Output**
  - Clearer sent/seen semantics for latest outbound message
  - No regressions to failed/retry indicators

### Step 5: Phase 1 regression pass
- **Files**
  - `docs/CHAT_PHASE_GATES_AND_REGRESSION.md`
  - `docs/BLOCK_UNBLOCK_CHATLIST_QA_MATRIX.md`
- **Owner area**: QA/validation
- **Output**
  - Phase 1 gate completion report

## Phase 2 Queue (planned next)

### Step 6: Forwarding foundation
- **Files**
  - `components/chat/ChannelMessageLayout.tsx` (action entry)
  - target-picker component (new) under `components/chat/`
- **Owner area**: Message actions + navigation

### Step 7: Forward metadata rendering
- **Files**
  - message render path in chat components (`components/chat/*`)
- **Owner area**: Message UI renderer

### Step 8: Starred data model + APIs
- **Files**
  - `lib/db.ts` (new model)
  - `app/api/me/starred-messages/*` (new routes)
- **Owner area**: API/data

### Step 9: Starred UI views
- **Files**
  - `components/chat/*` and/or `app/app/chats/*` view route additions
- **Owner area**: Chat UI surfaces

## Phase 3 Queue (hardening)
- Offline/resync state convergence
- Expanded observability and reliability checks
- Full matrix QA sign-off and release runbook execution

