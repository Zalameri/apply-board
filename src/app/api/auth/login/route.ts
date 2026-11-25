import { getDb } from "@/lib/db";
import { loginHandler } from "@/lib/handlers";

export const runtime = "nodejs";
export const POST = (req: Request) => loginHandler(getDb(), req);
