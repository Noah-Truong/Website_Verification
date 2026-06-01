import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { findUserByEmail, mutate } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
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

  const { name, email, password } = parsed.data;
  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 },
    );
  }

  const user = {
    id: randomUUID(),
    email,
    name,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  await mutate((db) => {
    db.users.push(user);
  });

  await createSession(user.id);
  return NextResponse.json({ id: user.id, name: user.name, email: user.email });
}
