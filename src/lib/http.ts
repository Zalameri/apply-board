import type { Db } from "./db";
import { AuthError, SESSION_COOKIE, SESSION_TTL_SECONDS, userFromToken, type User } from "./auth";
import { ValidationError } from "./applications";

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return undefined;
}

export function sessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

export const clearCookie = `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;

export function currentUser(db: Db, req: Request): User | null {
  return userFromToken(db, readCookie(req, SESSION_COOKIE));
}

/** CSRF defence for state-changing requests: JSON bodies only, and a present Origin must match the Host. */
export function checkCsrf(req: Request): Response | null {
  if (req.method === "GET" || req.method === "HEAD") return null;
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return json({ error: "Cross-origin request blocked" }, 403);
  if (!(req.headers.get("content-type") ?? "").includes("application/json") && req.method !== "DELETE") {
    return json({ error: "Content-Type must be application/json" }, 415);
  }
  return null;
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ValidationError("Body must be valid JSON");
  }
}

export function errorResponse(e: unknown): Response {
  if (e instanceof AuthError || e instanceof ValidationError) return json({ error: e.message }, e.status);
  console.error(e);
  return json({ error: "Server error" }, 500);
}

/** Runs a handler for a signed-in user, with CSRF checks and uniform error handling. */
export async function withUser(
  db: Db,
  req: Request,
  fn: (user: User) => Promise<Response> | Response,
): Promise<Response> {
  try {
    const bad = checkCsrf(req);
    if (bad) return bad;
    const user = currentUser(db, req);
    if (!user) return json({ error: "Not signed in" }, 401);
    return await fn(user);
  } catch (e) {
    return errorResponse(e);
  }
}
