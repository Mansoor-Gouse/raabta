import * as admin from "firebase-admin";

function initAdmin(): void {
  if (admin.apps.length > 0) return;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw || typeof raw !== "string") {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is not set (paste service account JSON as a single-line string)"
    );
  }

  let cred: admin.ServiceAccount;
  try {
    cred = JSON.parse(raw) as admin.ServiceAccount;
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must be valid JSON");
  }

  admin.initializeApp({
    credential: admin.credential.cert(cred),
  });
}

/** Verify a Firebase Auth ID token from the client (Phone OTP sign-in). */
export async function verifyFirebaseIdToken(
  idToken: string
): Promise<admin.auth.DecodedIdToken> {
  initAdmin();
  return admin.auth().verifyIdToken(idToken);
}
