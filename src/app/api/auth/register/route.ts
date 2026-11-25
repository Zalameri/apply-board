import { getDb } from "@/lib/db";
import { registerHandler } from "@/lib/handlers";

export const runtime = "nodejs";
export const POST = (req: Request) => registerHandler(getDb(), req);
