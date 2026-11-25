import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { SESSION_COOKIE, userFromToken } from "@/lib/auth";
import { computeStats, listApplications } from "@/lib/applications";
import { todayIso } from "@/lib/handlers";
import Board from "./board";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const db = getDb();
  const user = userFromToken(db, (await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) redirect("/");
  const apps = listApplications(db, user.id);
  return <Board email={user.email} isDemo={user.is_demo} initial={apps} initialStats={computeStats(apps, todayIso())} />;
}
