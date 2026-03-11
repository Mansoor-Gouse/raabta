# Messaging PWA

End-to-end messaging PWA with Stream Chat & Video, Material 3–style UI (Tailwind), MongoDB, and device-bound phone verification.

## Features

- **Auth**: Phone number verification via device binding (OTP once, then bind device; optional Firebase PNV).
- **Chat**: 1:1 and group channels, message list/input, threads, reactions, typing, read receipts (Stream Chat).
- **Calls**: Ring calls (1:1/group), accept/reject, in-call controls (mic, camera, screen share), Stream Video.
- **WhatsApp-like**: Voice messages, media, location/contacts (custom types), search, archive/mute, block/report.
- **Status/Stories**: Ephemeral 24h status via `/api/status` (list/post); viewer in app.
- **PWA**: Manifest, install prompt; add `icon-192.png` and `icon-512.png` to `public/` for icons.
- **Push**: Subscribe via `/api/push-subscribe`; store subscription in MongoDB for later push (e.g. new message/call).

## Setup

1. **Env** (copy from `.env.example`):

   - `MONGODB_URI` – MongoDB connection string.
   - `SESSION_SECRET` – Min 32 characters for session encryption.
   - `NEXT_PUBLIC_STREAM_API_KEY` and `STREAM_SECRET` – from [Stream dashboard](https://dashboard.getstream.io/).
   - Optional: `DEVICE_BINDING_SALT` for device binding hash.

2. **MongoDB**: Ensure MongoDB is running; app creates indexes on first use.

3. **Stream**: Create an app in Stream (Chat + Video). Use the same API key for both; create user tokens server-side only.

4. **Icons**: Add PWA icons to `public/`: `icon-192.png`, `icon-512.png`.

5. **Run**:

   ```bash
   npm install --legacy-peer-deps
   npm run dev
   ```

6. **OTP (dev)**: For phone verify, OTP is logged to server console when `NODE_ENV !== "production"`. In production, integrate Twilio/Firebase/MSG91 in `app/api/phone-verify/route.ts` to send SMS.

## Project structure

- `app/(auth)/` – Login, verify (device binding), register.
- `app/app/` – Main app: channel list, channel view, status, settings, new chat.
- `app/api/` – Auth session, phone-verify, device-bind, stream-token, push-subscribe, status.
- `components/` – Providers (Chat + Video), AppShell, ChannelList, CallPanel, CreateCallButton.
- `lib/` – db (MongoDB models), auth (session), stream-server (token), device-binding, otp.

## Build

```bash
export MONGODB_URI=mongodb://localhost:27017/messaging
npm run build
npm start
```
