import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { SESSION_COOKIE, userFromToken } from "@/lib/auth";
import { computeStats, listApplications } from "@/lib/applications";
import { todayIso } from "@/lib/handlers";
import { LANG_COOKIE, normalizeLang } from "@/lib/i18n";
import Board from "./board";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const db = getDb();
  const jar = await cookies();
  const user = userFromToken(db, jar.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/");
  const apps = listApplications(db, user.id);
  return <Board lang={normalizeLang(jar.get(LANG_COOKIE)?.value)} email={user.email} isDemo={user.is_demo} initial={apps} initialStats={computeStats(apps, todayIso())} />;
}
