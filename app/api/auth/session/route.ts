import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({
    user: {
      id: session.userId,
      phone: session.phone,
      name: session.name,
      image: session.image,
    },
  });
}

export async function DELETE() {
  const { destroySession } = await import("@/lib/auth");
  await destroySession();
  return NextResponse.json({ ok: true });
}
