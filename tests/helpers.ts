import { openDb, type Db } from "@/lib/db";
import { resetLoginLimiter } from "@/lib/auth";

export function freshDb(): Db {
  resetLoginLimiter();
  return openDb(":memory:");
}

export function req(path: string, init: { method?: string; body?: unknown; cookie?: string; origin?: string; type?: string | null } = {}) {
  const headers: Record<string, string> = { host: "localhost:3000" };
  if (init.type !== null) headers["content-type"] = init.type ?? "application/json";
  if (init.cookie) headers.cookie = init.cookie;
  if (init.origin) headers.origin = init.origin;
  return new Request(`http://localhost:3000${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

export function cookieFrom(res: Response): string {
  return (res.headers.get("set-cookie") ?? "").split(";")[0];
}
