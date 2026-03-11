# Events Module – Summary

A luxury event management module for a private social platform. It supports discovery, creation, RSVP, seating, trip planning, post-event networking, and host dashboards with a black-and-white (gradient) design system and curated, interactive flows.

---

## 1. Overview

| Area | Description |
|------|-------------|
| **Purpose** | Create, discover, and manage events (dinners, trips, retreats, Umrah, Hajj) with RSVP, seating, trip planning, and post-event connections. |
| **Design** | Scoped theme `.elite-events` with black/gradient accents, Playfair Display + DM Sans, safe-area-aware layout. |
| **Tech** | Next.js App Router, React, Tailwind, MongoDB/Mongoose, Stream Chat for event channels. |

---

## 2. Routes & Pages

| Route | Purpose |
|-------|---------|
| `/app/events` | Discovery: horizontal swipe sections (My events, Going to, Spotlight, Discover), filters, FAB to create. |
| `/app/events/new` | Event type picker (Event, Trip, Retreat, Umrah, Hajj). |
| `/app/events/new/[type]` | Multi-step creation wizard per type (curated chips, minimal text inputs). |
| `/app/events/[eventId]` | Event detail: hero, host, RSVP, actions (chat, pass, seating, trip, manage), attendees, post-event connections. |
| `/app/events/[eventId]/pass` | Digital entry pass (QR, “Add to Wallet” placeholder). |
| `/app/events/[eventId]/seating` | Seating plan: tables, assignments, zoom. Host can always access (attendee record upserted if missing). |
| `/app/events/[eventId]/trip` | Trip planner: activities, destination voting. |
| `/app/events/[eventId]/host` | Host dashboard: Overview, Guests, Seating, Trip, Analytics; approve/reject/offer spot; remove guest; event status. |
| `/app/events/[eventId]/edit` | Host-only: edit event details (title, date, location, capacity, etc.); PATCH. |
| `/app/profile/events` | Profile-scoped events list. |

---

## 3. APIs

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/events` | GET | List events with filters (category, dateRange, location, attending=me), pagination; returns `hostName` via `getDisplayName`, `attendeePreview`, `myStatus`, `eventFormat`, `venue`, `meetingLink`, `meetingDetails`. **Invite-only**: returned only if the current user is the host or has an EventAttendee record. |
| `/api/events/[eventId]` | GET, PATCH | Single event; **invite-only**: GET returns 404 if user is not host and has no attendee record. GET returns `eventFormat`, `venue`, `meetingLink`, `meetingDetails`. PATCH for host: status, title, description, **eventFormat**, **location**, **venue**, **meetingLink**, **meetingDetails**, startAt, endAt, capacity, visibility, category, dressCode, etiquette, halalMenuDetails, prayerFacilityInfo, allowGuestRequest, allowBringGuest, coverImage, audienceType. **Validation**: offline events require location and venue; online events require meetingLink. |
| `/api/events/[eventId]/rsvp` | POST | RSVP: going, request-invite (with note), decline. |
| `/api/events/[eventId]/guests` | GET, POST | Host: list accepted/pending/waitlisted/invited/declined; POST approve/reject (capacity enforced on approve), setTier, invite, remove. |
| `/api/events/[eventId]/ensure-channel` | POST | Create or get Stream channel for event chat; add members. |
| `/api/events/[eventId]/pass` | GET | Get or create entry pass (token, QR). |
| `/api/events/[eventId]/seating` | GET, PUT | Seating plan: tables and assignments. |
| `/api/events/[eventId]/trip` | GET, PUT | Trip plan: destination options (votes), activities. |
| `/api/events/[eventId]/connections` | GET, POST | Post-event connections (people you met, notes). |

---

## 4. Data Models (MongoDB)

- **Event** – `title`, `description`, `hostId`, `location`, `startAt`, `endAt`, `capacity`, `type` (event \| trip \| retreat \| umrah \| hajj), `coverImage`, `visibility` (network \| invite-only), `channelId`, `category`, `dressCode`, `etiquette`, `halalMenuDetails`, `prayerFacilityInfo`, `status` (active \| cancelled \| postponed), **`eventFormat`** (online \| offline, default offline), **`venue`** (offline), **`meetingLink`** (online), **`meetingDetails`** (online), etc. **Validation**: offline events require `location` and `venue`; online events require `meetingLink`.
- **EventAttendee** – `eventId`, `userId`, `status` (going, accepted, request-invite, declined, …), `vipTag`, `requestNote`, `networkingIntent`, `tableId`, `checkedInAt`.
- **EventEntryPass** – `eventId`, `userId`, `token` (for QR).
- **EventSeatingPlan** – `eventId`, `tables[]` (id, name, capacity), `assignments[]` (userId, tableId).
- **TripPlan** – `eventId`, `destinationOptions[]` (name, votes, votedBy), `activities[]`, `selectedHotel`.
- **PostEventConnection** – `eventId`, `userId`, `metUserId`, `notes`.

Display names use `lib/displayName.ts`: `getDisplayName(user)` → `fullName \|\| name \|\| maskPhone(phone)`.

---

## 5. Discovery (Events List)

- **Sections** (horizontal swipe, snap, in order): **Discover**, **Invited** (events where `myStatus === "invited"`), **Going to** (attending), **Spotlight** (featured), **My events** (hosted by user). Tabs above content; filter icon in header toggles filter row.
- **Filters** (expandable): category (Business, Philanthropy, Family, Religious, Curated Trips), date (Any time, This week, This month, Next 3 months), location (Dubai, London, Riyadh, …).
- **Cards**: `EliteEventCard` – cover or gradient + calendar/religious SVG placeholder, title, category, “Going”/invite-only badges, host + attendee preview avatars (black gradient fallback).
- **FAB**: Create event (bottom-right), black gradient, haptics. After create → navigate to My events (`/app/events?section=my`).
- **Loading**: `EliteEventsSkeleton`; “Load more” with skeleton. Staggered card entrance; reduced motion respected.

---

## 6. Event Detail

- **Hero**: Cover image or gradient + SVG placeholder; title; Past/Invite-only badges; date (end date if `endAt` set). **Place**: For online events, “Online” and join link in hero; “Online event” card with meeting link and optional details below. For offline events, venue and location (e.g. “Venue · City”) in hero.
- **Actions** (horizontal scroll, icon tiles): Chat, Pass, Seating, Trip; for host: Manage, Edit. Chat opens/creates Stream channel; haptics on actions.
- **Host**: Single clickable card → host profile (`/app/members/[id]`). No separate “View profile” button.
- **RSVP**: Going / Request invite (with note) / Decline. Hidden for host. Success haptic on accept/going.
- **Attendees**: List with avatars, VIP tag, networking intent (when not past). Past event: “People you met” + post-event connections (add/edit notes).
- **State**: Past computed from `event.endAt` (or `startAt` if no `endAt`). Loading: `EliteEventDetailSkeleton`.

---

## 7. Event Creation

- **Flow**: Type picker → type-specific wizard → create → redirect to My events.
- **Types**: Event, Trip, Retreat, Umrah, Hajj (each has own wizard in `app/app/events/new/[type]/`).
- **UX**: Curated chips and presets (title, date, location, dress code, etiquette, halal, prayer, vibe, capacity, cover URL); minimal free-text. Next/Cancel in one row with icons.
- **Layout**: `CreateStepLayout` + shared blocks: `BasicsBlock`, `QuickTitleChips`, `QuickDateChips`, `LocationChips`, `DressCodeChips`, `EtiquetteChips`, `HalalChips`, `PrayerChips`, `DescriptionVibeChips`, `CapacityPresets`, `OptionalCoverBlock`, `ExperienceBlock`, `GuestsBlock`, etc.

---

## 8. Host Dashboard

- **Tabs**: Overview, Guests, Seating, Trip, Analytics.
- **Guests**: Accepted list; pending requests with approve/reject (no accept/decline for host themselves).
- **Seating**: Link to seating page; table summary.
- **Trip**: Link to trip page; destination/activity summary.
- **Analytics**: Counts (accepted, pending, checked-in).
- **Event status**: active / cancelled / postponed (dropdown + PATCH).

---

## 9. Design System (Elite Events)

- **Scope**: All event UI under `.elite-events`.
- **Tokens** (see `app/globals.css`): `--elite-bg`, `--elite-surface`, `--elite-card`, `--elite-text`, `--elite-accent`, `--elite-accent-gradient`, `--elite-font-serif`, `--elite-font-sans`, `--elite-radius`, `--elite-shadow`, `--elite-transition`. Dark mode overrides under `.dark .elite-events`.
- **Accents**: Black/dark gradients for primary actions and selected chips (no blue in events module).
- **Motion**: Staggered card entrance (`elite-event-card-in`), FAB idle pulse (`elite-fab-idle`); disabled when `prefers-reduced-motion`.
- **Haptics**: `lib/haptics.ts` – `trigger("light"|"medium"|"success"|"error")` for chips, FAB, RSVP, action tiles (Vibration API, no-op when unsupported or reduced motion).

---

## 10. Key Components

| Component | Role |
|-----------|------|
| `EliteEventsClient` | Discovery page: sections, filters, list, FAB, load more. |
| `EliteEventCard` | Event card with cover/placeholder, badges, host/attendee avatars. |
| `EliteEventDetailClient` | Event detail: hero, actions, host, RSVP, attendees, connections. |
| `EliteEventDetailSkeleton` / `EliteEventsSkeleton` | Loading states. |
| `EliteHostDashboardClient` | Host tabs, guests, status. |
| `EliteSeatingClient` | Seating plan UI. |
| `EliteTripClient` | Trip planner UI (activities, voting). |
| `EliteEventPassClient` | Pass + QR. |
| `CreateStepLayout` | Step wrapper for wizards (Next/Cancel row). |
| `EventTypePicker` | Choose event type. |
| Shared elite components | `EliteCard`, `EliteChip`, `EliteButton`, `EliteAvatar` (with `gradientFallback`), `EliteSection`, etc. |

---

## 11. User Identity in Events

- **Display name**: `getDisplayName(user)` used for host and attendees in APIs and UI (event list, detail, pass, guests).
- **Capture**: First-time login can prompt for name (verify flow); profile edit allows setting name (syncs `name` and `fullName`, refreshes session).
- **Fallback**: If no name, show masked phone (`***1234`) via `maskPhone`.

---

## 12. Navigation & Shell

- **Events area**: App shell top bar and bottom nav are hidden on event routes so the module feels full-screen.
- **Create event**: FAB on `/app/events`; type picker then wizard; on success, `router.replace("/app/events?section=my")` to clear stack.

---

## 13. Invite-only visibility & push

- **Visibility rule**: An invite-only event is visible only to the organizer (`event.hostId === currentUserId`) or any user with an EventAttendee record (any status: invited, going, accepted, request-invite, waitlisted, declined). List API and single-event GET enforce this; single-event returns 404 when the user has no access.
- **Invited section**: Events where the user has `myStatus === "invited"` appear in the **Invited** section so invited users see pending invites; they are excluded from Discover and Spotlight.
- **Web Push**: When in-app notifications are created for `event_invite`, `event_request_approved`, `event_request_rejected`, `event_removed`, or `event_waitlisted`, a Web Push is sent to that user’s subscriptions (if any). Uses `lib/pushSend.ts` and the `web-push` package; configure `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in env (e.g. generate with `npx web-push generate-vapid-keys`). Push is sent asynchronously so the HTTP response is not delayed.

---

## 14. Online vs offline events

- **Event format**: Events have `eventFormat`: `"online"` (virtual, join via link) or `"offline"` (in-person). No native video/streaming; online events store a **meeting link** (and optional **meeting details**); attendees open the link in browser or app.
- **Offline**: Require **location** (e.g. city) and **venue** (e.g. “Grand Ballroom”). Enforced on POST (create) and PATCH (edit). Create wizard and edit page show Location + Venue when Offline is selected.
- **Online**: Require **meetingLink**. Optional **meetingDetails** (e.g. “Join via Zoom”). Enforced on POST and PATCH. Create wizard and edit page show Meeting link + optional details when Online is selected.
- **Display**: List cards show “Online” or “Venue · Location”. Detail hero and “Online event” card show join link and details for online; venue and location for offline.

This doc summarizes the event module as implemented; for exact behavior and new features, refer to the code and API handlers.
