import "server-only";
import bcrypt from "bcryptjs";
import { getSupabase } from "./supabase";
import type { User } from "./types";

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function findUserById(id: string): Promise<User | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  // A malformed or unknown id (e.g. a stale session) should log the user out,
  // not crash the request.
  if (error) return null;
  return data ? rowToUser(data as UserRow) : null;
}

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<User | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("users")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as UserRow;
  const ok = await bcrypt.compare(password, row.password_hash);
  return ok ? rowToUser(row) : null;
}
