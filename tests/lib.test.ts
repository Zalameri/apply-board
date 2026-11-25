import { describe, expect, it } from "vitest";
import { applicationInput } from "@/lib/schema";
import {
  ValidationError,
  computeStats,
  createApplication,
  deleteApplication,
  getApplication,
  listApplications,
  updateApplication,
} from "@/lib/applications";
import { buildIcs, escapeIcsText, foldLine } from "@/lib/ics";
import { seedDemoApplications } from "@/lib/seed";
import { freshDb } from "./helpers";

function userId(db: ReturnType<typeof freshDb>, email = "a@x.com") {
  return Number(db.prepare("INSERT INTO users (email, password_hash) VALUES (?, 'x')").run(email).lastInsertRowid);
}

describe("validation", () => {
  it("requires company and role, trims them and defaults status", () => {
    const r = applicationInput.parse({ company: "  Acme ", role: " Intern" });
    expect(r).toMatchObject({ company: "Acme", role: "Intern", status: "wishlist" });
    expect(applicationInput.safeParse({ company: "", role: "x" }).success).toBe(false);
  });
  it("rejects impossible dates, unknown statuses and javascript: URLs", () => {
    expect(applicationInput.safeParse({ company: "a", role: "b", deadline: "2026-02-31" }).success).toBe(false);
    expect(applicationInput.safeParse({ company: "a", role: "b", deadline: "2026-02-28" }).success).toBe(true);
    expect(applicationInput.safeParse({ company: "a", role: "b", status: "hired" }).success).toBe(false);
    expect(applicationInput.safeParse({ company: "a", role: "b", url: "javascript:alert(1)" }).success).toBe(false);
  });
});

describe("applications", () => {
  it("creates, lists (deadline first, undated last), updates and deletes", () => {
    const db = freshDb();
    const u = userId(db);
    createApplication(db, u, { company: "B", role: "r" });
    const early = createApplication(db, u, { company: "A", role: "r", deadline: "2026-12-01" });
    expect(listApplications(db, u).map((a) => a.company)).toEqual(["A", "B"]);
    const up = updateApplication(db, u, early.id, { status: "applied", notes: "sent" });
    expect(up).toMatchObject({ status: "applied", notes: "sent", company: "A" });
    expect(deleteApplication(db, u, early.id)).toBe(true);
    expect(getApplication(db, u, early.id)).toBeUndefined();
  });
  it("can clear a deadline with null", () => {
    const db = freshDb();
    const u = userId(db);
    const a = createApplication(db, u, { company: "A", role: "r", deadline: "2026-12-01" });
    expect(updateApplication(db, u, a.id, { deadline: null })?.deadline).toBeNull();
  });
  it("editing one field leaves the others (notably the status) untouched", () => {
    const db = freshDb();
    const u = userId(db);
    const a = createApplication(db, u, { company: "A", role: "r", status: "interview" });
    const up = updateApplication(db, u, a.id, { notes: "call on Monday" });
    expect(up).toMatchObject({ status: "interview", notes: "call on Monday" });
  });
  it("rejects an empty patch", () => {
    const db = freshDb();
    const u = userId(db);
    const a = createApplication(db, u, { company: "A", role: "r" });
    expect(() => updateApplication(db, u, a.id, {})).toThrow(ValidationError);
  });
  it("never lets one user read, change or delete another user's rows", () => {
    const db = freshDb();
    const alice = userId(db, "alice@x.com");
    const bob = userId(db, "bob@x.com");
    const a = createApplication(db, alice, { company: "Secret", role: "r" });
    expect(listApplications(db, bob)).toEqual([]);
    expect(getApplication(db, bob, a.id)).toBeUndefined();
    expect(updateApplication(db, bob, a.id, { company: "Hacked" })).toBeUndefined();
    expect(deleteApplication(db, bob, a.id)).toBe(false);
    expect(getApplication(db, alice, a.id)?.company).toBe("Secret");
  });
  it("treats SQL in text fields as plain text", () => {
    const db = freshDb();
    const u = userId(db);
    const evil = "x'); DROP TABLE applications;--";
    createApplication(db, u, { company: evil, role: "r" });
    expect(listApplications(db, u)[0].company).toBe(evil);
  });
});

describe("stats", () => {
  it("counts statuses, response rate and upcoming deadlines relative to today", () => {
    const db = freshDb();
    const u = userId(db);
    createApplication(db, u, { company: "W", role: "r", status: "wishlist", deadline: "2026-12-05" });
    createApplication(db, u, { company: "A", role: "r", status: "applied", deadline: "2026-11-30" });
    createApplication(db, u, { company: "I", role: "r", status: "interview" });
    createApplication(db, u, { company: "R", role: "r", status: "rejected", deadline: "2026-11-27" });
    createApplication(db, u, { company: "Far", role: "r", status: "applied", deadline: "2027-03-01" });
    const s = computeStats(listApplications(db, u), "2026-11-25");
    expect(s.total).toBe(5);
    expect(s.byStatus).toMatchObject({ wishlist: 1, applied: 2, interview: 1, rejected: 1, offer: 0 });
    expect(s.responseRate).toBe(50); // 2 responded of 4 submitted
    expect(s.upcoming.map((x) => [x.company, x.daysLeft])).toEqual([["A", 5], ["W", 10]]);
  });
  it("has no response rate before anything is submitted", () => {
    expect(computeStats([], "2026-11-25").responseRate).toBeNull();
  });
});

describe("ics", () => {
  const stamp = new Date("2026-11-25T08:00:00Z");
  it("writes all-day events only for applications with deadlines", () => {
    const db = freshDb();
    const u = userId(db);
    createApplication(db, u, { company: "Acme, Inc.", role: "ML; Intern", deadline: "2026-12-31", url: "https://x.test/j" });
    createApplication(db, u, { company: "NoDate", role: "r" });
    const ics = buildIcs(listApplications(db, u), stamp);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261231");
    expect(ics).toContain("DTEND;VALUE=DATE:20270101"); // crosses the year boundary
    expect(ics).toContain("SUMMARY:Deadline: ML\; Intern at Acme\\, Inc.");
    expect(ics).toContain("DTSTAMP:20261125T080000Z");
  });
  it("escapes text and folds long lines at 75 octets without splitting characters", () => {
    expect(escapeIcsText("a\\b;c,d\ne")).toBe("a\\\\b\;c\\,d\\ne");
    const folded = foldLine("SUMMARY:" + "ع".repeat(80));
    for (const part of folded.split("\r\n")) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.split("\r\n ").join("")).toBe("SUMMARY:" + "ع".repeat(80));
  });
});

describe("demo seed", () => {
  it("adds fictional applications covering every status, with deadlines relative to today", () => {
    const db = freshDb();
    const u = userId(db);
    seedDemoApplications(db, u, "2026-11-25");
    const apps = listApplications(db, u);
    expect(new Set(apps.map((a) => a.status)).size).toBe(5);
    expect(computeStats(apps, "2026-11-25").upcoming.length).toBeGreaterThan(0);
  });
});
