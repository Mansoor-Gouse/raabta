# Deployment guide

Production setup for database, environment variables, and optional services (Stream, Web Push).

**OTP:** Optional **Twilio Verify** for real OTP in production (default channel: **WhatsApp**; set `TWILIO_VERIFY_CHANNEL=sms` for SMS). Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_VERIFY_SERVICE_SID` (see [§7](#7-otp--twilio-verify-whatsapp-or-sms)). For local/dev without Twilio, omit those vars and use the local MongoDB OTP (console logs the code when `NODE_ENV !== "production"`), or set `FIXED_OTP_CODE` with `ALLOW_FIXED_OTP=true` (or non-production) for a static test code.

---

## Quick: Deploy on Vercel with Atlas

Do these in order. Your repo is already on GitHub.

### A. Create MongoDB Atlas cluster

1. Open **[cloud.mongodb.com](https://cloud.mongodb.com)** → Sign up / Log in.
2. **Build a database** → choose **M0 (free)** → pick a cloud provider/region → Create.
3. **Database Access** (left sidebar) → **Add New Database User** → Authentication: Password → set username & password (save them) → Add User.
4. **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`) → Confirm (required for Vercel serverless).
5. **Database** (left) → **Connect** on your cluster → **Drivers** → copy the connection string (e.g. `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`).
6. Replace `<password>` in the string with your actual user password (URL-encode special chars). Add the DB name: before `?` insert `/raabta` so it ends with `...mongodb.net/raabta?retryWrites=...`. Save this as your `MONGODB_URI`.

### B. Deploy on Vercel

1. Open **[vercel.com](https://vercel.com)** → Sign in with **GitHub**.
2. **Add New** → **Project** → import the **Mansoor-Gouse/raabta** repo (or your repo name).
3. **Configure Project**: Framework Preset = Next.js, leave build/dev settings as default → **Deploy** (first deploy may fail until env vars are set).
4. **Settings** → **Environment Variables**. Add these for **Production** (and Preview if you want):

   | Name | Value |
   |------|--------|
   | `MONGODB_URI` | Your Atlas connection string (with `/raabta`) |
   | `SESSION_SECRET` | Long random string (32+ chars); e.g. run in PowerShell: `[Convert]::ToBase64String((1..32 \| ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])` |
   | `NEXT_PUBLIC_STREAM_API_KEY` | From [Stream dashboard](https://dashboard.getstream.io/) |
   | `STREAM_SECRET` | From Stream dashboard (same app) |
| `FIXED_OTP_CODE` | Optional. Static test code; only honored when `ALLOW_FIXED_OTP=true` or non-production. |
| `ALLOW_FIXED_OTP` | Optional. Set `true` to allow `FIXED_OTP_CODE` in **production** (avoid in real deployments). |
| `TWILIO_ACCOUNT_SID` | Twilio Verify: Account SID from [Twilio Console](https://console.twilio.com/). |
| `TWILIO_AUTH_TOKEN` | Twilio Verify: Auth Token (server-only). |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify: Verify Service SID (Create a Verify service → enable WhatsApp and/or SMS). |
| `TWILIO_VERIFY_CHANNEL` | Optional. `whatsapp` (default) or `sms` — which channel Verify uses to deliver the code. |
| `TWILIO_DEFAULT_COUNTRY_CODE` | Optional. Digits only, default `91` (E.164 for stored 10-digit numbers). |
| `OTP_PROVIDER` | Optional. `twilio` or `local` — overrides auto-detection (default: Twilio if all Twilio vars set, else local). |

5. **Deployments** → open the latest deployment → **Redeploy** (or push a new commit) so the app runs with the new env vars.

Your app URL will be like `https://raabta-xxx.vercel.app`. For login without Twilio, either omit Twilio vars (local OTP / dev console) or set `FIXED_OTP_CODE` and `ALLOW_FIXED_OTP=true` for a static test code (not for real users).

---

## 1. Database (MongoDB)

Use a **hosted MongoDB** in production. `localhost` will not work on Vercel, Railway, or similar.

### MongoDB Atlas (recommended)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and create an account (free tier is enough).
2. Create a **cluster** (e.g. M0 free).
3. **Database Access** → Add user → set username/password (save them).
4. **Network Access** → Add IP address → for serverless (Vercel) add `0.0.0.0/0` so your app can connect from any IP.
5. **Connect** → Drivers → copy the connection string. It looks like:
   ```text
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Add your database name to the path (e.g. use `raabta` as DB name):
   ```text
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/raabta?retryWrites=true&w=majority
   ```
7. Set this as `MONGODB_URI` in your deployment env (see below).

**Security:** Use a strong password and restrict IPs later if your host provides static IPs.

---

## 2. Environment variables

Set these in your hosting dashboard (Vercel, Railway, Render, or in `.env` for Docker).

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string (Atlas or other hosted MongoDB). |
| `SESSION_SECRET` | Yes | Min 32 characters. Use a long random string (e.g. `openssl rand -base64 32`). |
| `NEXT_PUBLIC_STREAM_API_KEY` | Yes | Stream Chat/Video API key (public, safe in client). |
| `STREAM_SECRET` | Yes | Stream secret (server-only; never expose). |
| `DEVICE_BINDING_SALT` | No | Salt for device-binding hashes; omit to use default. |
| `FIXED_OTP_CODE` | No | Static OTP for testing; requires `ALLOW_FIXED_OTP=true` or non-production. |
| `ALLOW_FIXED_OTP` | No | `true` to allow fixed OTP in production. |
| `TWILIO_ACCOUNT_SID` | No* | *Required for Twilio Verify (WhatsApp or SMS). |
| `TWILIO_AUTH_TOKEN` | No* | Twilio Auth Token. |
| `TWILIO_VERIFY_SERVICE_SID` | No* | Verify Service SID. |
| `TWILIO_VERIFY_CHANNEL` | No | `whatsapp` (default) or `sms`. |
| `TWILIO_DEFAULT_COUNTRY_CODE` | No | Default `91` (India); E.164 prefix for stored 10-digit phones. |
| `OTP_PROVIDER` | No | `twilio` or `local` to force provider. |
| `VAPID_PUBLIC_KEY` | No | Web Push: public key (from `npx web-push generate-vapid-keys`). |
| `VAPID_PRIVATE_KEY` | No | Web Push: private key. Set both or neither for push to work. |

- **Vercel:** Project → Settings → Environment Variables. Add each for **Production** (and optionally Preview).
- **Railway / Render:** Project → Variables. Add each.
- **Docker:** Pass via `-e` or an env file; do not bake secrets into the image.

Generate a secure `SESSION_SECRET`:

```bash
# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Or use an online generator and pick a 32+ character random string.

---

## 3. Stream Chat / Video

1. Go to [dashboard.getstream.io](https://dashboard.getstream.io/) and sign in.
2. Create an app (or use existing). You get:
   - **API Key** → set as `NEXT_PUBLIC_STREAM_API_KEY`
   - **API Secret** → set as `STREAM_SECRET`
3. Enable **Chat** and **Video** for the app if needed.
4. Add these two env vars in your deployment (see table above). Tokens are created server-side in `app/api/stream-token/route.ts`; never expose `STREAM_SECRET` to the client.

---

## 4. Web Push (optional)

Only needed if you want push notifications (e.g. new message/call).

1. Generate keys:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Set `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in your deployment env.
3. If you omit both, the app still runs; push subscribe may fail gracefully (see `lib/pushSend.ts`).

---

## 5. Where to set env vars by platform

- **Vercel:** Settings → Environment Variables → add each key/value, scope to Production (and Preview if you want).
- **Railway / Render:** Project → Variables / Environment → add each.
- **Docker:** Use `docker run -e MONGODB_URI=... -e SESSION_SECRET=...` or `--env-file .env.production` (keep `.env.production` out of git).

After changing env vars, **redeploy** so the new values are picked up.

---

## 6. Post-deploy checks

1. **Health:** Open your app URL; login/verify and main app should load.
2. **DB:** Use a feed or status feature; if data appears, MongoDB is connected.
3. **Chat:** Open a channel; if messages load and you can send, Stream is configured.
4. **Push:** If you set VAPID keys, subscribe to push in the app and trigger a test notification.

---

## 7. OTP / Twilio Verify (WhatsApp or SMS)

Production OTP uses **Twilio Verify** when `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_VERIFY_SERVICE_SID` are set (unless `OTP_PROVIDER=local`).

By default the app uses **`TWILIO_VERIFY_CHANNEL=whatsapp`** so the code is delivered over **WhatsApp**. Set `TWILIO_VERIFY_CHANNEL=sms` to use SMS instead.

### Twilio Console (one-time)

1. Sign up at [twilio.com](https://www.twilio.com/) and open the **[Console](https://console.twilio.com/)**.
2. Copy **Account SID** and **Auth Token** → set `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` in your deployment env (never commit).
3. Go to **Verify** → **Services** → **Create** a Verify Service. Copy the **Service SID** → `TWILIO_VERIFY_SERVICE_SID`.
4. In the Verify Service, enable the channel(s) you need:
   - **WhatsApp:** Complete Twilio’s WhatsApp onboarding (sender / [WhatsApp Business](https://www.twilio.com/docs/whatsapp) setup) so Verify can send OTP messages on WhatsApp. See Twilio’s **Verify + WhatsApp** documentation for your region.
   - **SMS:** Enable SMS and ensure your target geography is allowed (e.g. **India +91** for national numbers stored as 10 digits).
5. Phone numbers are sent to Twilio as **E.164**: by default `+` + `TWILIO_DEFAULT_COUNTRY_CODE` (default `91`) + 10 digits.

### Behavior

- **Twilio mode:** `send` starts a Verify verification on the configured channel (`whatsapp` or `sms`); `verify` checks the code with Twilio (no OTP hash stored in MongoDB for that flow).
- **Local mode:** If Twilio env vars are omitted (or `OTP_PROVIDER=local`), the app uses the existing **MongoDB `OtpSession`** + hashed OTP from [`lib/otp.ts`](lib/otp.ts); in development the code is logged to the server console.
- **Fixed test code:** `FIXED_OTP_CODE` works only when `NODE_ENV !== "production"` **or** `ALLOW_FIXED_OTP=true`, so production is not accidentally left open.

### Vercel

Add the Twilio variables under **Settings → Environment Variables** for Production (and Preview if needed), then redeploy.
