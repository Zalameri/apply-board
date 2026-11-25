import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createHandler,
  deleteHandler,
  demoHandler,
  exportHandler,
  listHandler,
  loginHandler,
  logoutHandler,
  registerHandler,
  statsHandler,
  updateHandler,
} from "@/lib/handlers";
import { createSession, userFromToken } from "@/lib/auth";
import { cookieFrom, freshDb, req } from "./helpers";

let db: ReturnType<typeof freshDb>;
beforeEach(() => {
  db = freshDb();
});

async function signUp(email = "a@x.com", password = "password123") {
  const res = await registerHandler(db, req("/api/auth/register", { method: "POST", body: { email, password } }));
  return { res, cookie: cookieFrom(res) };
}

describe("auth", () => {
  it("registers, sets an HttpOnly SameSite cookie, and never stores the password or raw token", async () => {
    const { res, cookie } = await signUp();
    expect(res.status).toBe(201);
    const setCookie = res.headers.get("set-cookie")!;
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Lax/);
    const row = db.prepare("SELECT password_hash FROM users").get() as { password_hash: string };
    expect(row.password_hash).toMatch(/^\$2[aby]\$/);
    expect(row.password_hash).not.toContain("password123");
    const token = cookie.split("=")[1];
    const stored = db.prepare("SELECT token_hash FROM sessions").get() as { token_hash: string };
    expect(stored.token_hash).not.toBe(token);
  });
  it("rejects short passwords, bad emails and duplicate accounts", async () => {
    expect((await signUp("a@x.com", "short")).res.status).toBe(400);
    expect((await signUp("not-an-email")).res.status).toBe(400);
    await signUp();
    expect((await signUp()).res.status).toBe(409);
  });
  it("logs in with the right password only, with one generic error", async () => {
    await signUp();
    const ok = await loginHandler(db, req("/api/auth/login", { method: "POST", body: { email: "A@x.com", password: "password123" } }));
    expect(ok.status).toBe(200);
    const wrong = await loginHandler(db, req("/api/auth/login", { method: "POST", body: { email: "a@x.com", password: "wrongwrong" } }));
    const unknown = await loginHandler(db, req("/api/auth/login", { method: "POST", body: { email: "no@x.com", password: "wrongwrong" } }));
    expect(wrong.status).toBe(401);
    expect(await wrong.json()).toEqual(await unknown.json());
  });
  it("locks an email after 5 failed attempts", async () => {
    await signUp();
    const bad = () => loginHandler(db, req("/api/auth/login", { method: "POST", body: { email: "a@x.com", password: "wrongwrong" } }));
    for (let i = 0; i < 5; i++) expect((await bad()).status).toBe(401);
    expect((await bad()).status).toBe(429);
    const good = await loginHandler(db, req("/api/auth/login", { method: "POST", body: { email: "a@x.com", password: "password123" } }));
    expect(good.status).toBe(429);
  });
  it("logout invalidates the session", async () => {
    const { cookie } = await signUp();
    expect((await listHandler(db, req("/api/applications", { cookie }))).status).toBe(200);
    await logoutHandler(db, req("/api/auth/logout", { method: "POST", cookie }));
    expect((await listHandler(db, req("/api/applications", { cookie }))).status).toBe(401);
  });
  it("expired sessions are not accepted", () => {
    const u = Number(db.prepare("INSERT INTO users (email, password_hash) VALUES ('e@x.com','x')").run().lastInsertRowid);
    const token = createSession(db, u, 1_000);
    expect(userFromToken(db, token, 2_000)?.email).toBe("e@x.com");
    expect(userFromToken(db, token, 1_000 + 8 * 24 * 3600 * 1000)).toBeNull();
  });
});

describe("applications API", () => {
  it("requires a session", async () => {
    expect((await listHandler(db, req("/api/applications"))).status).toBe(401);
    expect((await createHandler(db, req("/api/applications", { method: "POST", body: { company: "a", role: "b" } }))).status).toBe(401);
    expect((await exportHandler(db, req("/api/applications/export"))).status).toBe(401);
  });
  it("creates, updates, lists and deletes through the handlers", async () => {
    const { cookie } = await signUp();
    const c = await createHandler(db, req("/api/applications", { method: "POST", cookie, body: { company: "Acme", role: "Intern", deadline: "2026-12-10" } }));
    expect(c.status).toBe(201);
    const { application } = await c.json();
    const u = await updateHandler(db, req(`/api/applications/${application.id}`, { method: "PATCH", cookie, body: { status: "interview" } }), String(application.id));
    expect((await u.json()).application.status).toBe("interview");
    const l = await (await listHandler(db, req("/api/applications", { cookie }))).json();
    expect(l.applications).toHaveLength(1);
    const s = await (await statsHandler(db, req("/api/stats", { cookie }), "2026-12-01")).json();
    expect(s.stats.upcoming).toHaveLength(1);
    const d = await deleteHandler(db, req(`/api/applications/${application.id}`, { method: "DELETE", cookie, type: null }), String(application.id));
    expect(d.status).toBe(200);
  });
  it("returns 400 for invalid data and 404 for other users' ids", async () => {
    const alice = await signUp("alice@x.com");
    const bob = await signUp("bob@x.com");
    const bad = await createHandler(db, req("/api/applications", { method: "POST", cookie: alice.cookie, body: { company: "", role: "r" } }));
    expect(bad.status).toBe(400);
    const made = await (await createHandler(db, req("/api/applications", { method: "POST", cookie: alice.cookie, body: { company: "A", role: "r" } }))).json();
    const id = String(made.application.id);
    expect((await updateHandler(db, req(`/api/applications/${id}`, { method: "PATCH", cookie: bob.cookie, body: { notes: "x" } }), id)).status).toBe(404);
    expect((await deleteHandler(db, req(`/api/applications/${id}`, { method: "DELETE", cookie: bob.cookie, type: null }), id)).status).toBe(404);
    expect((await updateHandler(db, req("/api/applications/abc", { method: "PATCH", cookie: alice.cookie, body: { notes: "x" } }), "abc")).status).toBe(400);
    const badJson = new Request("http://localhost:3000/api/applications", { method: "POST", headers: { host: "localhost:3000", "content-type": "application/json", cookie: alice.cookie }, body: "{nope" });
    expect((await createHandler(db, badJson)).status).toBe(400);
  });
  it("blocks cross-origin and non-JSON state changes (CSRF)", async () => {
    const { cookie } = await signUp();
    const cross = await createHandler(db, req("/api/applications", { method: "POST", cookie, origin: "https://evil.example", body: { company: "a", role: "b" } }));
    expect(cross.status).toBe(403);
    const form = await createHandler(db, req("/api/applications", { method: "POST", cookie, type: "text/plain", body: { company: "a", role: "b" } }));
    expect(form.status).toBe(415);
    const same = await createHandler(db, req("/api/applications", { method: "POST", cookie, origin: "http://localhost:3000", body: { company: "a", role: "b" } }));
    expect(same.status).toBe(201);
  });
  it("exports only the caller's deadlines as a calendar file", async () => {
    const alice = await signUp("alice@x.com");
    const bob = await signUp("bob@x.com");
    await createHandler(db, req("/api/applications", { method: "POST", cookie: alice.cookie, body: { company: "AliceCo", role: "r", deadline: "2026-12-10" } }));
    const res = await exportHandler(db, req("/api/applications/export", { cookie: bob.cookie }));
    expect(res.headers.get("content-type")).toContain("text/calendar");
    expect(await res.text()).not.toContain("AliceCo");
    const own = await exportHandler(db, req("/api/applications/export", { cookie: alice.cookie }));
    expect(await own.text()).toContain("AliceCo");
  });
});

describe("demo mode", () => {
  it("creates a passwordless demo account with sample data and can be disabled", async () => {
    const res = await demoHandler(db, req("/api/auth/demo", { method: "POST", body: {} }));
    expect(res.status).toBe(201);
    const cookie = cookieFrom(res);
    const list = await (await listHandler(db, req("/api/applications", { cookie }))).json();
    expect(list.applications.length).toBe(5);
    const user = db.prepare("SELECT email, is_demo FROM users").get() as { email: string; is_demo: number };
    expect(user.is_demo).toBe(1);
    const login = await loginHandler(db, req("/api/auth/login", { method: "POST", body: { email: user.email, password: "!!!!!!!!!!" } }));
    expect(login.status).toBe(401); // the placeholder hash can never match a password
    vi.stubEnv("ENABLE_DEMO", "0");
    expect((await demoHandler(db, req("/api/auth/demo", { method: "POST", body: {} }))).status).toBe(404);
    vi.unstubAllEnvs();
  });
});
