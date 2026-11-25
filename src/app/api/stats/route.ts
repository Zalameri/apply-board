import { getDb } from "@/lib/db";
import { statsHandler } from "@/lib/handlers";

export const runtime = "nodejs";
export const GET = (req: Request) => statsHandler(getDb(), req);
