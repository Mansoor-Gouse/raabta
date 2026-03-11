import crypto from "crypto";

const SALT = process.env.DEVICE_BINDING_SALT || "device-binding-salt";

export function hashDeviceId(deviceId: string): string {
  return crypto.createHash("sha256").update(SALT + deviceId).digest("hex");
}

export function validateDeviceIdFormat(deviceId: string): boolean {
  return typeof deviceId === "string" && deviceId.length >= 16 && deviceId.length <= 512;
}
