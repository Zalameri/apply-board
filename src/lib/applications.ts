import type { Db } from "./db";
import {
  STATUSES,
  applicationInput,
  applicationPatch,
  type Application,
  type Status,
} from "./schema";

export class ValidationError extends Error {
  status = 400;
}

const COLUMNS = "id, company, role, status, deadline, url, notes, created_at, updated_at";

function parse<T>(schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: { issues: { message: string; path: PropertyKey[] }[] } } }, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) {
    const i = r.error!.issues[0];
    throw new ValidationError(`${i.path.join(".") || "input"}: ${i.message}`);
  }
  return r.data as T;
}

export function listApplications(db: Db, userId: number): Application[] {
  return db
    .prepare(`SELECT ${COLUMNS} FROM applications WHERE user_id = ? ORDER BY deadline IS NULL, deadline, id`)
    .all(userId) as Application[];
}

export function getApplication(db: Db, userId: number, id: number): Application | undefined {
  return db
    .prepare(`SELECT ${COLUMNS} FROM applications WHERE id = ? AND user_id = ?`)
    .get(id, userId) as Application | undefined;
}

export function createApplication(db: Db, userId: number, input: unknown): Application {
  const a = parse(applicationInput, input);
  const info = db
    .prepare(
      "INSERT INTO applications (user_id, company, role, status, deadline, url, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(userId, a.company, a.role, a.status, a.deadline ?? null, a.url ?? "", a.notes ?? "");
  return getApplication(db, userId, Number(info.lastInsertRowid))!;
}

const PATCHABLE = ["company", "role", "status", "deadline", "url", "notes"] as const;

/** Returns undefined when the application does not exist or belongs to someone else. */
export function updateApplication(db: Db, userId: number, id: number, input: unknown): Application | undefined {
  const patch = parse(applicationPatch, input) as Record<string, unknown>;
  const keys = PATCHABLE.filter((k) => patch[k] !== undefined);
  if (keys.length === 0) throw new ValidationError("input: nothing to update");
  // Column names come from the fixed PATCHABLE list, never from user input; values are bound parameters.
  const sets = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => patch[k] ?? null);
  const info = db
    .prepare(`UPDATE applications SET ${sets}, updated_at = datetime('now') WHERE id = ? AND user_id = ?`)
    .run(...values, id, userId);
  return info.changes ? getApplication(db, userId, id) : undefined;
}

export function deleteApplication(db: Db, userId: number, id: number): boolean {
  return db.prepare("DELETE FROM applications WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
}

export interface Stats {
  total: number;
  byStatus: Record<Status, number>;
  /** Share of submitted applications (everything except the wishlist) that got an interview, offer or rejection. */
  responseRate: number | null;
  upcoming: { id: number; company: string; role: string; deadline: string; daysLeft: number }[];
}

/** `today` is a YYYY-MM-DD string so the result does not depend on the server clock or time zone. */
export function computeStats(apps: Application[], today: string, horizonDays = 14): Stats {
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  for (const a of apps) byStatus[a.status] += 1;
  const submitted = apps.length - byStatus.wishlist;
  const responded = byStatus.interview + byStatus.offer + byStatus.rejected;
  const dayMs = 86_400_000;
  const t0 = Date.parse(`${today}T00:00:00Z`);
  const upcoming = apps
    .filter((a) => a.deadline && a.status !== "rejected" && a.status !== "offer")
    .map((a) => ({
      id: a.id,
      company: a.company,
      role: a.role,
      deadline: a.deadline as string,
      daysLeft: Math.round((Date.parse(`${a.deadline}T00:00:00Z`) - t0) / dayMs),
    }))
    .filter((a) => a.daysLeft >= 0 && a.daysLeft <= horizonDays)
    .sort((x, y) => x.daysLeft - y.daysLeft || x.id - y.id);
  return {
    total: apps.length,
    byStatus,
    responseRate: submitted === 0 ? null : Math.round((responded / submitted) * 100),
    upcoming,
  };
}
