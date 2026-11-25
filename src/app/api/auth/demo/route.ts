import { getDb } from "@/lib/db";
import { demoHandler } from "@/lib/handlers";

export const runtime = "nodejs";
export const POST = (req: Request) => demoHandler(getDb(), req);
