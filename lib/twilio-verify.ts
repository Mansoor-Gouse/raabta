import twilio from "twilio";

/** Twilio Verify delivery channel. Default: whatsapp (set TWILIO_VERIFY_CHANNEL=sms to use SMS). */
export type VerifyChannel = "whatsapp" | "sms";

/**
 * Twilio Verify is used when all three env vars are set, unless OTP_PROVIDER=local.
 * Set OTP_PROVIDER=twilio to force Twilio even if you add more config later.
 */
export function isTwilioVerifyConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_VERIFY_SERVICE_SID
  );
}

export function shouldUseTwilioVerify(): boolean {
  const p = process.env.OTP_PROVIDER?.trim().toLowerCase();
  if (p === "local") return false;
  if (p === "twilio") return true;
  return isTwilioVerifyConfigured();
}

/** Digits only, no leading + (default 91 for India). */
export function getDefaultCountryCode(): string {
  const raw = process.env.TWILIO_DEFAULT_COUNTRY_CODE ?? "91";
  const digits = raw.replace(/\D/g, "");
  return digits.length > 0 ? digits : "91";
}

/** Build E.164 from 10-digit national number (storage format in this app). */
export function toE164(phoneDigits10: string): string {
  const cc = getDefaultCountryCode();
  return `+${cc}${phoneDigits10}`;
}

export function getVerifyChannel(): VerifyChannel {
  const raw = process.env.TWILIO_VERIFY_CHANNEL?.trim().toLowerCase();
  if (raw === "sms") return "sms";
  // Default: WhatsApp (OTP via Twilio Verify + WhatsApp Business)
  if (raw === "whatsapp" || raw === undefined || raw === "") return "whatsapp";
  return "whatsapp";
}

export type TwilioVerifySendResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export async function sendVerification(toE164Phone: string): Promise<TwilioVerifySendResult> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const authToken = process.env.TWILIO_AUTH_TOKEN!;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID!;
    const client = twilio(accountSid, authToken);
    const channel = getVerifyChannel();
    await client.verify.v2.services(serviceSid).verifications.create({
      to: toE164Phone,
      channel,
    });
    return { ok: true };
  } catch (e: unknown) {
    const mapped = mapTwilioError(e);
    return { ok: false, status: mapped.status, error: mapped.error };
  }
}

export type TwilioVerifyCheckResult =
  | { ok: true; approved: boolean }
  | { ok: false; status: number; error: string };

export async function checkVerification(
  toE164Phone: string,
  code: string
): Promise<TwilioVerifyCheckResult> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const authToken = process.env.TWILIO_AUTH_TOKEN!;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID!;
    const client = twilio(accountSid, authToken);
    const check = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: toE164Phone,
        code: code.trim(),
      });
    const approved = check.status === "approved";
    return { ok: true, approved };
  } catch (e: unknown) {
    const mapped = mapTwilioError(e);
    return { ok: false, status: mapped.status, error: mapped.error };
  }
}

function mapTwilioError(e: unknown): { status: number; error: string } {
  if (e && typeof e === "object" && "status" in e) {
    const err = e as { status?: number; code?: number; message?: string };
    const status = typeof err.status === "number" ? err.status : 500;
    const code = err.code;

    if (status === 429 || code === 20429) {
      return {
        status: 429,
        error: "Too many requests. Try again later.",
      };
    }
    if (status >= 400 && status < 500) {
      return {
        status: 400,
        error: "Invalid phone number or verification request failed.",
      };
    }
    return {
      status: status >= 500 ? 502 : 400,
      error: "Verification service temporarily unavailable.",
    };
  }
  return { status: 500, error: "Verification failed" };
}
