# Release Runbook: Block/Unblock + ChatList

## 1) Pre-release checks
- Complete `docs/BLOCK_UNBLOCK_CHATLIST_QA_MATRIX.md`.
- Review logs for:
  - `[block-flow] block success|failed`
  - `[block-flow] unblock success|failed`
  - `[block-flow] blocked guard shown`
  - `[chat-list] schedule refresh`
  - `[chat-list] channels refreshed`
  - `[webhooks/stream] message.new push dispatch`

## 2) Staged rollout approach
- Stage 1: Deploy to staging/internal only.
- Stage 2: Limited production exposure window (monitoring period).
- Stage 3: Full production rollout after 24-48h clean signals.

## 3) Monitoring expectations
- No spike in blocked/unblocked failures.
- No complaints about:
  - blocked DMs still sendable
  - chats not moving to top on new message
  - unread badges stale
  - global side-effects across unrelated users

## 4) Post-stability cleanup
- Remove noisy temporary debug logs if no longer needed.
- Keep essential webhook decision logs.
- Update product docs/changelog.

## 5) Lint debt follow-up
- Existing unrelated lint errors should be tracked and fixed separately.
- Prioritize hook-rule violations and reliability-critical warnings first.

