import crypto from "crypto";
import { connectDB, OtpSession } from "./db";

const OTP_TTL_MINUTES = 10;
const OTP_LENGTH = 6;

export function generateOtpCode(): string {
  const digits = "0123456789";
  let code = "";
  const bytes = crypto.randomBytes(OTP_LENGTH);
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += digits[bytes[i]! % 10];
  }
  return code;
}

export function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function storeOtpSession(phone: string, code: string): Promise<void> {
  await connectDB();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  await OtpSession.deleteMany({ phone });
  await OtpSession.create({
    phone,
    codeHash: hashOtp(code),
    expiresAt,
  });
}

export async function verifyOtpSession(phone: string, code: string): Promise<boolean> {
  await connectDB();
  const session = await OtpSession.findOne({ phone });
  if (!session || session.expiresAt < new Date()) return false;
  const match = session.codeHash === hashOtp(code);
  if (match) await OtpSession.deleteOne({ _id: session._id });
  return match;
}
