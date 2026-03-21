import { NextRequest, NextResponse } from "next/server";
import { connectDB, User } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { verifyOtpSession, storeOtpSession, generateOtpCode } from "@/lib/otp";
import {
  shouldUseTwilioVerify,
  isTwilioVerifyConfigured,
  toE164,
  sendVerification,
  checkVerification,
} from "@/lib/twilio-verify";

// Rate limit: allow 1 send per phone per 60s (simple in-memory for demo; use Redis in prod)
const sendCooldown = new Map<string, number>();
const COOLDOWN_MS = 60_000;

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

/** FIXED_OTP bypass: dev by default; production only if ALLOW_FIXED_OTP=true */
function allowsFixedOtpBypass(): boolean {
  return (
    process.env.ALLOW_FIXED_OTP === "true" ||
    process.env.NODE_ENV !== "production"
  );
}

/** When true: no SMS/WhatsApp, no OTP check — any code works after send (dev/demo only). */
function skipOtpValidation(): boolean {
  return process.env.SKIP_OTP_VALIDATION === "true";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code, action, name: nameFromBody } = body as {
      phone?: string;
      code?: string;
      action?: "send" | "verify";
      name?: string;
    };

    if (action === "send") {
      if (!phone || typeof phone !== "string") {
        return NextResponse.json(
          { error: "Phone number required" },
          { status: 400 }
        );
      }
      const normalized = normalizePhone(phone);
      if (normalized.length < 10) {
        return NextResponse.json(
          { error: "Invalid phone number" },
          { status: 400 }
        );
      }
      const last = sendCooldown.get(normalized);
      if (last && Date.now() - last < COOLDOWN_MS) {
        return NextResponse.json(
          { error: "Please wait before requesting another code" },
          { status: 429 }
        );
      }

      if (skipOtpValidation()) {
        if (process.env.NODE_ENV === "production") {
          console.warn(
            "[phone-verify] SKIP_OTP_VALIDATION is on — remove before real production"
          );
        }
        sendCooldown.set(normalized, Date.now());
        return NextResponse.json({
          ok: true,
          message: "OTP validation disabled — enter any 6 digits on the next screen",
        });
      }

      if (shouldUseTwilioVerify()) {
        if (!isTwilioVerifyConfigured()) {
          return NextResponse.json(
            { error: "SMS verification is not configured" },
            { status: 503 }
          );
        }
        const e164 = toE164(normalized);
        const result = await sendVerification(e164);
        if (!result.ok) {
          return NextResponse.json(
            { error: result.error },
            { status: result.status }
          );
        }
        sendCooldown.set(normalized, Date.now());
        return NextResponse.json({ ok: true, message: "Code sent" });
      }

      const fixedOtp = process.env.FIXED_OTP_CODE;
      const otpCode =
        fixedOtp && fixedOtp.length >= 4 ? fixedOtp : generateOtpCode();
      await storeOtpSession(normalized, otpCode);
      sendCooldown.set(normalized, Date.now());
      if (!fixedOtp && process.env.NODE_ENV !== "production") {
        console.log("[DEV] OTP for", normalized, ":", otpCode);
      }
      return NextResponse.json({ ok: true, message: "Code sent" });
    }

    if (action === "verify") {
      if (!phone || !code) {
        return NextResponse.json(
          { error: "Phone and code required" },
          { status: 400 }
        );
      }
      const normalized = normalizePhone(phone);
      if (normalized.length !== 10) {
        return NextResponse.json(
          { error: "Invalid phone number" },
          { status: 400 }
        );
      }
      const codeStr = String(code).trim();
      const fixedOtp = process.env.FIXED_OTP_CODE;
      const allowFixed =
        allowsFixedOtpBypass() &&
        !!fixedOtp &&
        fixedOtp.length >= 4 &&
        codeStr === fixedOtp;

      if (skipOtpValidation()) {
        if (process.env.NODE_ENV === "production") {
          console.warn(
            "[phone-verify] SKIP_OTP_VALIDATION is on — remove before real production"
          );
        }
        if (codeStr.length < 6) {
          return NextResponse.json(
            { error: "Enter a 6-digit code" },
            { status: 400 }
          );
        }
      } else if (shouldUseTwilioVerify()) {
        if (!isTwilioVerifyConfigured()) {
          return NextResponse.json(
            { error: "SMS verification is not configured" },
            { status: 503 }
          );
        }
        if (!allowFixed) {
          const check = await checkVerification(toE164(normalized), codeStr);
          if (!check.ok) {
            return NextResponse.json(
              { error: check.error },
              { status: check.status }
            );
          }
          if (!check.approved) {
            return NextResponse.json(
              { error: "Invalid or expired code" },
              { status: 400 }
            );
          }
        }
      } else {
        const valid =
          allowFixed || (await verifyOtpSession(normalized, codeStr));
        if (!valid) {
          return NextResponse.json(
            { error: "Invalid or expired code" },
            { status: 400 }
          );
        }
      }
      await connectDB();
      let user = await User.findOne({ phone: normalized });
      if (!user) {
        user = await User.create({ phone: normalized });
      }
      const needsName = !user.fullName && !user.name;
      const nameToSet = typeof nameFromBody === "string" ? nameFromBody.trim() : "";
      if (needsName && nameToSet) {
        user = await User.findByIdAndUpdate(
          user._id,
          { $set: { name: nameToSet, fullName: nameToSet } },
          { new: true }
        ).exec();
        if (!user) {
          return NextResponse.json({ error: "User not found" }, { status: 500 });
        }
      }
      const displayName = user.fullName || user.name;
      await createSession(
        user._id.toString(),
        normalized,
        displayName,
        user.image
      );
      return NextResponse.json({
        ok: true,
        needsName: !user.fullName && !user.name,
        user: {
          id: user._id.toString(),
          phone: user.phone,
          name: user.name ?? user.fullName,
          image: user.image,
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error("phone-verify", e);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
