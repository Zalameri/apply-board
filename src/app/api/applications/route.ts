import { getDb } from "@/lib/db";
import { createHandler, listHandler } from "@/lib/handlers";

export const runtime = "nodejs";
export const GET = (req: Request) => listHandler(getDb(), req);
export const POST = (req: Request) => createHandler(getDb(), req);
