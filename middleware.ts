import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { unsealData } from "iron-session";
import type { SessionData } from "@/lib/auth";

const COOKIE_NAME = "messaging_session";
const PASSWORD =
  process.env.SESSION_SECRET || "complex-secret-min-32-chars-long!!";

export async function middleware(request: NextRequest) {
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  let session: SessionData = { userId: "", phone: "", isLoggedIn: false };
  if (cookie) {
    try {
      session = await unsealData<SessionData>(cookie, { password: PASSWORD });
    } catch {
      // invalid session
    }
  }
  const path = request.nextUrl.pathname;

  if (path.startsWith("/app") && !session.isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if ((path === "/login" || path === "/verify") && session.isLoggedIn) {
    return NextResponse.redirect(new URL("/app", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/login", "/verify"],
};
