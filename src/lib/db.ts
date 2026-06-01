import { promises as fs } from "fs";
import path from "path";
import type { Database, Project, User } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "store.json");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

const EMPTY_DB: Database = { users: [], projects: [] };

let writeQueue: Promise<void> = Promise.resolve();

async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function readDb(): Promise<Database> {
  await ensureDirs();
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as Database;
    return {
      users: parsed.users ?? [],
      projects: parsed.projects ?? [],
    };
  } catch {
    return structuredClone(EMPTY_DB);
  }
}

async function writeDb(db: Database): Promise<void> {
  await ensureDirs();
  const tmp = `${DB_PATH}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_PATH);
}

/**
 * Serialize all mutations so concurrent requests don't clobber the JSON file.
 */
export function mutate<T>(fn: (db: Database) => Promise<T> | T): Promise<T> {
  const run = writeQueue.then(async () => {
    const db = await readDb();
    const result = await fn(db);
    await writeDb(db);
    return result;
  });
  // Keep the queue chain alive even if a mutation rejects.
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const db = await readDb();
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function findUserById(id: string): Promise<User | undefined> {
  const db = await readDb();
  return db.users.find((u) => u.id === id);
}

export async function getProjectsForUser(userId: string): Promise<Project[]> {
  const db = await readDb();
  return db.projects
    .filter((p) => p.ownerId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProject(
  id: string,
  userId: string,
): Promise<Project | undefined> {
  const db = await readDb();
  return db.projects.find((p) => p.id === id && p.ownerId === userId);
}
