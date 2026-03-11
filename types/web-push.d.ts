declare module "web-push" {
  interface VapidKeys {
    publicKey: string;
    privateKey: string;
  }
  interface PushSubscription {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }
  export function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void;
  export function generateVAPIDKeys(): VapidKeys;
  export function sendNotification(
    subscription: PushSubscription,
    payload: string | Buffer | null,
    options?: { TTL?: number; [key: string]: unknown }
  ): Promise<{ statusCode: number }>;
}
