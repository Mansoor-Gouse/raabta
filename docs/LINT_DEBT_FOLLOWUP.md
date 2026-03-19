# Lint Debt Follow-up

This follow-up is intentionally separate from block/unblock and chat-list behavior changes.

## Why separate
- Keeps functional work scoped and lower risk.
- Avoids mixing broad lint cleanup with user-facing behavior changes.

## Priority order
1. **Errors first** (`react-hooks/rules-of-hooks`, parsing errors, type-safety issues)
2. **Hook dependency warnings** in frequently used runtime paths
3. **Accessibility warnings** that can cause UX breakage
4. **Performance-oriented warnings** such as `no-img-element`

## Current known examples
- `components/chat/ViewOnceMessage.tsx`
  - `react-hooks/rules-of-hooks` error
- Multiple `react-hooks/exhaustive-deps` warnings across feed/events/status/profile flows.
- Multiple `@next/next/no-img-element` warnings.

## Execution checklist
- [ ] Fix hook-rule errors first and verify runtime behavior.
- [ ] Triage dependency warnings into safe fixes vs intentional exceptions.
- [ ] Address accessibility warnings in chat/new flows.
- [ ] Batch image-related warnings in dedicated optimization pass.
- [ ] Re-run lint and record net warning/error reduction.

