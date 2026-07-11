import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyCredentials } from "@/lib/users";
import { createSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;
  let user;
  try {
    user = await verifyCredentials(email, password);
  } catch (err) {
    console.error("Login failed: could not reach the database.", err);
    return NextResponse.json(
      { error: "Cannot reach the database. Check that the Supabase project is active." },
      { status: 503 },
    );
  }
  if (!user) {
    return NextResponse.json(
      { error: "Incorrect email or password." },
      { status: 401 },
    );
  }

  await createSession(user.id);
  return NextResponse.json({ id: user.id, name: user.name, email: user.email });
}
