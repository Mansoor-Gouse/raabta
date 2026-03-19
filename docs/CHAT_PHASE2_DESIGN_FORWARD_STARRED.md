# Phase 2 Design: Forwarding and Starred Messages

## Objective
Define implementation-ready technical decisions for:
- Message forwarding
- Starred messages

## A) Forward Message Flow

### UX target
- User opens message actions -> `Forward`.
- Target picker opens (existing chat + search user/group).
- On confirm, app sends forwarded payload to selected target channel(s).

### Recommended technical approach
1. Reuse Stream message send path with a structured `customData` envelope:
   - `forwardedFromMessageId`
   - `forwardedFromChannelId`
   - `forwardedFromSenderId`
2. Reuse or extend existing contact/channel selection surfaces:
   - `app/app/new/page.tsx`
   - `components/chat/ChannelList.tsx` selection mode (new)
3. Render forwarded UI treatment in message item renderer using custom fields.

### Why this approach
- Avoids new DB schema for forwarding.
- Keeps behavior aligned with existing Stream-centric architecture.

## B) Starred Messages Flow

### UX target
- User taps `Star` on a message action.
- Message appears in a `Starred messages` view per user.
- User can unstar from message actions or starred list.

### Storage options
1. **Stream message custom fields**  
   - Not ideal for per-user starring because star is user-specific, not message-global.
2. **App DB model (recommended)**  
   - Create `StarredMessage` model:
     - `userId`
     - `channelId`
     - `messageId`
     - `createdAt`

### Recommended approach
- Use app DB model + lightweight APIs:
  - `POST /api/me/starred-messages` (star)
  - `DELETE /api/me/starred-messages/[messageId]` (unstar)
  - `GET /api/me/starred-messages` (list)
- Keep Stream message as source for display content, DB as user-specific index.

### Why this approach
- Correct per-user semantics.
- Querying/starred views are straightforward and independent from Stream message mutation rules.

## Dependencies and Risks
- Forwarding requires message renderer updates to visualize forwarded metadata.
- Starred flow needs API auth checks and indexing (`userId + createdAt`, `userId + messageId` unique).

