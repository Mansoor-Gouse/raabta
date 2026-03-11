import { cookies } from "next/headers";
import { sealData, unsealData } from "iron-session";

export interface SessionData {
  userId: string;
  phone: string;
  name?: string;
  image?: string;
  isLoggedIn: boolean;
}

const COOKIE_NAME = "messaging_session";
const PASSWORD =
  process.env.SESSION_SECRET || "complex-secret-min-32-chars-long!!";
const TTL = 60 * 60 * 24 * 7; // 1 week

export async function getSession(): Promise<SessionData> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME)?.value;
  if (!cookie) {
    return { userId: "", phone: "", isLoggedIn: false };
  }
  try {
    const session = await unsealData<SessionData>(cookie, {
      password: PASSWORD,
    });
    return session || { userId: "", phone: "", isLoggedIn: false };
  } catch {
    return { userId: "", phone: "", isLoggedIn: false };
  }
}

export async function createSession(
  userId: string,
  phone: string,
  name?: string,
  image?: string
) {
  const session: SessionData = {
    userId,
    phone,
    name,
    image,
    isLoggedIn: true,
  };
  const sealed = await sealData(session, {
    password: PASSWORD,
    ttl: TTL,
  });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TTL,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requireAuth(): Promise<SessionData | null> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return null;
  return session;
}
