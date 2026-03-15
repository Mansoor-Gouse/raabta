# Next Steps and Enhancements — Messaging

Prioritized roadmap for reliability, UX, and feature improvements.

---

## 1. Reliability & data consistency

| Item | Description | Effort |
|------|-------------|--------|
| **Real-time unread badge** | Update navbar unread count when channels are marked read (e.g. after opening a channel) instead of only on window focus. Subscribe to `message.read` / channel state or refetch when navigating back to chats. | Small |
| **Draft persistence** | Persist unsent message per channel in `localStorage` (or session) so leaving and re-opening a channel restores the draft. | Small |
| **Retry with backoff** | Beyond the existing Retry button, add automatic retry with exponential backoff for failed sends. | Small |
| **Offline queue** | Optionally queue sends when offline and flush when back online (Stream may support; verify). | Medium |

---

## 2. UX & polish

| Item | Description | Effort |
|------|-------------|--------|
| **Pull-to-refresh (chat list)** | Add pull-to-refresh on the chats list to reload channels and unread counts. | Small |
| **Swipe actions (chat list)** | Swipe row to archive, mute, or mark read (mobile). | Medium |
| **New message sound** | Optional sound when a new message arrives (with per-app or per-channel mute). | Small |
| **Haptic feedback** | Light haptic on send / message actions on supported mobile devices. | Small |
| **Typing in list or header** | Show “X is typing…” in channel list preview or keep current header typing indicator. | Small |
| **Link previews** | Ensure `enrichURLForPreview` is used and preview cards render well in messages. | Small |
| **Message long-press menu** | Reply, copy, delete, forward, pin from long-press (if not already full). | Medium |
| **Desktop / browser notifications** | When tab is in background, show `Notification` API toast (in addition to push) for new messages. | Small |

---

## 3. Features

| Item | Description | Effort |
|------|-------------|--------|
| **Forward message** | “Forward” to another chat (new screen or modal to pick channel, then send as forwarded message). | Medium |
| **Delete for me / for everyone** | Delete message for current user only or for all (with permission). | Small |
| **@mentions in groups** | Ensure @mention autocomplete and highlighting work in group channels (Stream supports this). | Small |
| **Quiet hours / Do Not Disturb** | Mute push notifications for a time window; respect in webhook when sending push. | Medium |
| **Rich push actions** | Reply or “Mark as read” from notification (requires push payload and client handling). | Medium |
| **Per-channel notification settings** | Mute / unmute notifications per channel and surface in UI. | Medium |
| **Search improvements** | Global search (channels + messages), filters (date, sender), and better empty states. | Medium |

---

## 4. Performance & scale

| Item | Description | Effort |
|------|-------------|--------|
| **Virtualized channel list** | Use a virtual list (e.g. `react-window` / `react-virtuoso`) for 100+ channels. | Medium |
| **Image lazy loading** | Lazy load images in message list and in SharedPostCard / avatars. | Small |
| **Pagination / “Load more”** | If channel list grows, add pagination or “load more” instead of loading all at once. | Small |

---

## 5. Accessibility & inclusivity

| Item | Description | Effort |
|------|-------------|--------|
| **Screen reader announcements** | Announce “New message from X” or “N unread” when messages arrive or list updates. | Small |
| **Keyboard shortcuts** | Send (e.g. Enter), focus input, next/prev channel, mark read. | Small |
| **Reduced motion** | Respect `prefers-reduced-motion` for animations (scroll, transitions). | Small |
| **Focus management** | On open/close of modals (e.g. group members, share sheet), trap focus and return to trigger. | Small |

---

## 6. Security & privacy

| Item | Description | Effort |
|------|-------------|--------|
| **Block list sync** | Ensure blocked users are hidden and block state is consistent across Chats, New chat, Share. | Small |
| **Report flow** | Clear report UI, confirmation, and (optional) admin view for reported content. | Small |
| **Sensitive content** | Optional blur or warning for shared links/media (e.g. parental controls). | Large |

---

## 7. Developer experience & ops

| Item | Description | Effort |
|------|-------------|--------|
| **E2E tests** | Critical paths: login → open chat → send → see in list; create group; share post. | Medium |
| **Error monitoring** | Integrate Sentry (or similar) for uncaught errors and failed API calls. | Small |
| **Stream SDK version** | Track and plan upgrades for `stream-chat` / `stream-chat-react` for fixes and features. | Ongoing |
| **Rate limiting** | Protect auth, token, and webhook endpoints from abuse. | Small |

---

## Suggested order to tackle

1. **Quick wins:** Real-time unread badge, pull-to-refresh, new message sound (optional), draft persistence.
2. **UX:** Swipe actions, message long-press (reply/copy/delete/forward), desktop notifications.
3. **Features:** Forward message, delete for me/for everyone, @mentions check, per-channel mute.
4. **Scale:** Virtualized list and lazy loading if channel count grows.
5. **Quality:** E2E tests, a11y (announcements, keyboard, reduced motion), error monitoring.

Use this as a living doc: tick off items as you ship and add new ideas under the right section.
