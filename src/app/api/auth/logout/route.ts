import { getDb } from "@/lib/db";
import { logoutHandler } from "@/lib/handlers";

export const runtime = "nodejs";
export const POST = (req: Request) => logoutHandler(getDb(), req);
