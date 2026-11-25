import { getDb } from "@/lib/db";
import { exportHandler } from "@/lib/handlers";

export const runtime = "nodejs";
export const GET = (req: Request) => exportHandler(getDb(), req);
