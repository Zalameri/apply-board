import { getDb } from "@/lib/db";
import { parseAdHandler } from "@/lib/handlers";

export const runtime = "nodejs";
export const POST = (req: Request) => parseAdHandler(getDb(), req);
