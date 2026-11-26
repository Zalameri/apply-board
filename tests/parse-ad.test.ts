import { beforeEach, describe, expect, it } from "vitest";
import { findDate, parseJobAd } from "@/lib/parse-ad";
import { parseAdHandler, registerHandler } from "@/lib/handlers";
import { cookieFrom, freshDb, req } from "./helpers";

const AD = `Software Engineering Intern at Nimbus Labs
Join Nimbus Labs, a team building maps for cities.

Requirements:
- Comfortable with Python and SQL
- Familiar with Git
- Good communication

Benefits:
- Free lunch

Application deadline: 15 December 2026
Apply at https://nimbus.example/jobs/42.`;

describe("findDate", () => {
  it("reads ISO, day-first numeric and month-name dates", () => {
    expect(findDate("by 2026-12-15", "2026-11-26")).toBe("2026-12-15");
    expect(findDate("by 15/12/2026", "2026-11-26")).toBe("2026-12-15");
    expect(findDate("by December 15th, 2026", "2026-11-26")).toBe("2026-12-15");
    expect(findDate("by 3 Jan 2027", "2026-11-26")).toBe("2027-01-03");
  });
  it("rejects impossible dates", () => {
    expect(findDate("by 2026-02-30", "2026-11-26")).toBeNull();
    expect(findDate("by 31/04/2026", "2026-11-26")).toBeNull();
  });
});

describe("parseJobAd", () => {
  it("extracts role, company, deadline, link and requirements", () => {
    const p = parseJobAd(AD, "2026-11-26");
    expect(p.role).toBe("Software Engineering Intern");
    expect(p.company).toBe("Nimbus Labs");
    expect(p.deadline).toBe("2026-12-15");
    expect(p.url).toBe("https://nimbus.example/jobs/42");
    expect(p.requirements).toEqual(["Comfortable with Python and SQL", "Familiar with Git", "Good communication"]);
    expect(p.requirements.join()).not.toContain("lunch");
  });
  it("builds a checklist from the skills and deadline it really found", () => {
    const c = parseJobAd(AD, "2026-11-26").checklist.join("\n");
    expect(c).toContain("Python");
    expect(c).toContain("SQL");
    expect(c).toContain("2026-12-15");
    expect(c).not.toContain("Rust");
  });
  it("uses labelled fields and leaves unknown ones empty instead of guessing", () => {
    const p = parseJobAd("Company: Acme\nRole: Data Intern\nSome text without a date or link.", "2026-11-26");
    expect(p).toMatchObject({ company: "Acme", role: "Data Intern", deadline: null, url: "" });
  });
  it("does not treat javascript: links as a posting URL", () => {
    expect(parseJobAd("Role: X\nCompany: Y\njavascript:alert(1)", "2026-11-26").url).toBe("");
  });
});

describe("POST /api/parse-ad", () => {
  let db: ReturnType<typeof freshDb>;
  beforeEach(() => {
    db = freshDb();
  });
  it("requires a signed-in user", async () => {
    expect((await parseAdHandler(db, req("/api/parse-ad", { method: "POST", body: { text: AD } }))).status).toBe(401);
  });
  it("returns the parsed ad and validates the input", async () => {
    const cookie = cookieFrom(await registerHandler(db, req("/api/auth/register", { method: "POST", body: { email: "a@x.com", password: "password123" } })));
    const ok = await parseAdHandler(db, req("/api/parse-ad", { method: "POST", body: { text: AD }, cookie }));
    expect(ok.status).toBe(200);
    expect((await ok.json()).parsed.company).toBe("Nimbus Labs");
    expect((await parseAdHandler(db, req("/api/parse-ad", { method: "POST", body: { text: "hi" }, cookie }))).status).toBe(400);
    expect((await parseAdHandler(db, req("/api/parse-ad", { method: "POST", body: { text: "x".repeat(12001) }, cookie }))).status).toBe(400);
    expect((await parseAdHandler(db, req("/api/parse-ad", { method: "POST", body: { text: AD }, cookie, origin: "http://evil.test" }))).status).toBe(403);
  });
});
