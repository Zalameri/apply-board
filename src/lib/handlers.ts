import type { Db } from "./db";
import { AuthError, createSession, destroySession, login, register, SESSION_COOKIE } from "./auth";
import {
  ValidationError,
  computeStats,
  createApplication,
  deleteApplication,
  listApplications,
  updateApplication,
} from "./applications";
import { buildIcs } from "./ics";
import { seedDemoApplications } from "./seed";
import {
  checkCsrf,
  clearCookie,
  errorResponse,
  json,
  readCookie,
  readJson,
  sessionCookie,
  withUser,
} from "./http";
import { MAX_AD_LENGTH, parseJobAd } from "./parse-ad";
import crypto from "node:crypto";

export const todayIso = () => new Date().toISOString().slice(0, 10);

async function authHandler(db: Db, req: Request, act: "register" | "login"): Promise<Response> {
  try {
    const bad = checkCsrf(req);
    if (bad) return bad;
    const body = await readJson(req);
    const user = act === "register" ? await register(db, body) : await login(db, body);
    const token = createSession(db, user.id);
    return json({ user: { email: user.email } }, act === "register" ? 201 : 200, {
      "set-cookie": sessionCookie(token),
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export const registerHandler = (db: Db, req: Request) => authHandler(db, req, "register");
export const loginHandler = (db: Db, req: Request) => authHandler(db, req, "login");

export function logoutHandler(db: Db, req: Request): Response {
  const bad = checkCsrf(req);
  if (bad) return bad;
  destroySession(db, readCookie(req, SESSION_COOKIE));
  return json({ ok: true }, 200, { "set-cookie": clearCookie });
}

/** Creates a throwaway account pre-filled with fictional applications. Disabled with ENABLE_DEMO=0. */
export async function demoHandler(db: Db, req: Request): Promise<Response> {
  try {
    const bad = checkCsrf(req);
    if (bad) return bad;
    if (process.env.ENABLE_DEMO === "0") throw new AuthError("Demo mode is disabled", 404);
    const email = `demo-${crypto.randomBytes(6).toString("hex")}@demo.invalid`;
    const hash = "!"; // not a valid bcrypt hash: nobody can log in to this account with a password
    const info = db.prepare("INSERT INTO users (email, password_hash, is_demo) VALUES (?, ?, 1)").run(email, hash);
    const userId = Number(info.lastInsertRowid);
    seedDemoApplications(db, userId, todayIso());
    return json({ user: { email } }, 201, { "set-cookie": sessionCookie(createSession(db, userId)) });
  } catch (e) {
    return errorResponse(e);
  }
}

export const listHandler = (db: Db, req: Request) =>
  withUser(db, req, (u) => json({ applications: listApplications(db, u.id) }));

export const createHandler = (db: Db, req: Request) =>
  withUser(db, req, async (u) => json({ application: createApplication(db, u.id, await readJson(req)) }, 201));

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError("id must be a positive integer");
  return id;
}

export const updateHandler = (db: Db, req: Request, rawId: string) =>
  withUser(db, req, async (u) => {
    const app = updateApplication(db, u.id, parseId(rawId), await readJson(req));
    return app ? json({ application: app }) : json({ error: "Not found" }, 404);
  });

export const deleteHandler = (db: Db, req: Request, rawId: string) =>
  withUser(db, req, (u) =>
    deleteApplication(db, u.id, parseId(rawId)) ? json({ ok: true }) : json({ error: "Not found" }, 404),
  );

export const statsHandler = (db: Db, req: Request, today = todayIso()) =>
  withUser(db, req, (u) => json({ stats: computeStats(listApplications(db, u.id), today) }));

export const exportHandler = (db: Db, req: Request) =>
  withUser(db, req, (u) =>
    new Response(buildIcs(listApplications(db, u.id)), {
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": 'attachment; filename="deadlines.ics"',
        "cache-control": "no-store",
      },
    }),
  );

/** Extracts company, role, deadline and a preparation checklist from pasted job-ad text (local parser, nothing is saved). */
export const parseAdHandler = (db: Db, req: Request) =>
  withUser(db, req, async () => {
    const body = (await readJson(req)) as { text?: unknown };
    if (typeof body?.text !== "string" || body.text.trim().length < 10) throw new ValidationError("Paste the job ad text (at least 10 characters)");
    if (body.text.length > MAX_AD_LENGTH) throw new ValidationError(`Job ad is too long (max ${MAX_AD_LENGTH} characters)`);
    return json({ parsed: parseJobAd(body.text, todayIso()) });
  });
