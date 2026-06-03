import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true });
}

// GET clears the session cookie and bounces to login. Used to recover from a
// stale/invalid session (e.g. a cookie pointing at a user that no longer exists).
export async function GET(req: Request) {
  await destroySession();
  return NextResponse.redirect(new URL("/login", req.url));
}
