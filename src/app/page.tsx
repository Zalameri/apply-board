import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { SESSION_COOKIE, userFromToken } from "@/lib/auth";
import AuthForm from "./auth-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (userFromToken(getDb(), token)) redirect("/board");
  return <AuthForm demoEnabled={process.env.ENABLE_DEMO !== "0"} />;
}
