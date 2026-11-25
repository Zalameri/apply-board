import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import type { Db } from "./db";
import { credentials } from "./schema";

export const SESSION_COOKIE = "ab_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export interface User {
  id: number;
  email: string;
  is_demo: boolean;
}

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

// Failed-login limiter, in memory (per server process): 5 failures per email in 15 minutes.
const failures = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

export function resetLoginLimiter() {
  failures.clear();
}

function checkLimiter(email: string, now: number) {
  const f = failures.get(email);
  if (f && now - f.first > WINDOW_MS) failures.delete(email);
  const cur = failures.get(email);
  if (cur && cur.count >= MAX_FAILURES) throw new AuthError("Too many attempts. Try again later.", 429);
}

function recordFailure(email: string, now: number) {
  const cur = failures.get(email);
  if (!cur || now - cur.first > WINDOW_MS) failures.set(email, { count: 1, first: now });
  else cur.count += 1;
}

export async function register(db: Db, input: unknown): Promise<User> {
  const parsed = credentials.safeParse(input);
  if (!parsed.success) throw new AuthError(parsed.error.issues[0].message, 400);
  const { email, password } = parsed.data;
  const hash = await bcrypt.hash(password, 12);
  try {
    const info = db.prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)").run(email, hash);
    return { id: Number(info.lastInsertRowid), email, is_demo: false };
  } catch (e) {
    if (e instanceof Error && /UNIQUE/.test(e.message)) throw new AuthError("Email already registered", 409);
    throw e;
  }
}

// Used to keep response time similar when the email does not exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

export async function login(db: Db, input: unknown, now = Date.now()): Promise<User> {
  const parsed = credentials.safeParse(input);
  if (!parsed.success) throw new AuthError("Invalid email or password", 400);
  const { email, password } = parsed.data;
  checkLimiter(email, now);
  const row = db
    .prepare("SELECT id, email, password_hash, is_demo FROM users WHERE email = ?")
    .get(email) as { id: number; email: string; password_hash: string; is_demo: number } | undefined;
  const ok = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);
  if (!row || !ok) {
    recordFailure(email, now);
    throw new AuthError("Invalid email or password", 401);
  }
  failures.delete(email);
  return { id: row.id, email: row.email, is_demo: !!row.is_demo };
}

/** Creates a random session token; only its SHA-256 hash is stored. */
export function createSession(db: Db, userId: number, now = Date.now()): string {
  const token = crypto.randomBytes(32).toString("base64url");
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(
    hashToken(token),
    userId,
    now + SESSION_TTL_SECONDS * 1000,
  );
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now);
  return token;
}

export function userFromToken(db: Db, token: string | undefined, now = Date.now()): User | null {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.is_demo FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(hashToken(token), now) as { id: number; email: string; is_demo: number } | undefined;
  return row ? { id: row.id, email: row.email, is_demo: !!row.is_demo } : null;
}

export function destroySession(db: Db, token: string | undefined) {
  if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}
