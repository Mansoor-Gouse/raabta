# Push notifications setup

For **new message** push notifications to work end-to-end, all of the following must be in place.

## 1. Environment variables

Set in Vercel (and locally in `.env`):

| Variable | Description |
|----------|-------------|
| `VAPID_PUBLIC_KEY` | Web Push VAPID public key (from `npx web-push generate-vapid-keys`) |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private key |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Same value as `VAPID_PUBLIC_KEY` (used by the browser to subscribe) |
| `STREAM_SECRET` | Stream Chat API secret (used to verify webhook signatures) |

## 2. Stream Chat webhook (required for new-message push)

The backend sends push only when **Stream** calls our webhook on each new message. If the webhook is not configured, no push is sent.

1. Open [Stream Dashboard](https://dashboard.getstream.io/) → your app → **Chat** → **Event Hooks** (or **Webhooks**).
2. Add a webhook:
   - **Webhook URL**: `https://YOUR_DEPLOYED_DOMAIN/api/webhooks/stream`  
     (e.g. `https://your-app.vercel.app/api/webhooks/stream`)  
     Must be **public HTTPS**. Localhost will not work.
   - **Event type**: `message.new`
   - **Signing secret**: Use the same value as your `STREAM_SECRET` env var (Stream uses it to sign the request body; we verify the `X-Signature` header).

3. Save. Stream will POST to your URL on every new message.

## 3. User subscription (client)

- User must **enable notifications** (e.g. via the banner on the Chats page or **Settings → Push notifications → Enable**).
- This registers the service worker, requests permission, and sends the push subscription to `/api/push-subscribe`, which stores it in the DB by `userId`. The `userId` must match the Stream Chat user id (same as the one used in `connectUser`).

## 4. Verify the pipeline

1. **Test push (no Stream)**  
   In **Settings**, enable push, then click **Send test notification**. You should get a “Test notification” on the device. If this works, subscription and VAPID are correct.

2. **Check logs (Vercel)**  
   When someone sends a message, you should see:
   - `[webhooks/stream] message.new` with `channelId`, `memberIds`, `senderName`  
   - `[pushSend] Sending to user X subscriptions: N`  
   If you see `No push subscriptions for user`, that user has not subscribed (or subscribed with a different user id).  
   If you never see `[webhooks/stream] message.new`, the Stream webhook is not being called (wrong URL, not deployed, or event not enabled).

## Common issues

- **No push on new message**: Configure the Stream webhook (step 2) and ensure the URL is the **deployed** app URL.
- **Invalid signature**: `STREAM_SECRET` in your app must exactly match the signing secret configured in the Stream Dashboard for the webhook.
- **No push subscriptions for user**: User has not clicked “Enable” or subscription failed; ensure `userId` in your session matches the Stream user id.
- **Test works but real messages don’t**: Webhook not configured or not reachable; check Vercel function logs for `[webhooks/stream]`.
