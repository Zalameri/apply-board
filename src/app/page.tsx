import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { SESSION_COOKIE, userFromToken } from "@/lib/auth";
import { LANG_COOKIE, normalizeLang } from "@/lib/i18n";
import AuthForm from "./auth-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (userFromToken(getDb(), token)) redirect("/board");
  return <AuthForm demoEnabled={process.env.ENABLE_DEMO !== "0"} lang={normalizeLang(jar.get(LANG_COOKIE)?.value)} />;
}
