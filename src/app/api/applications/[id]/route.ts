import { getDb } from "@/lib/db";
import { deleteHandler, updateHandler } from "@/lib/handlers";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };
export const PATCH = async (req: Request, ctx: Ctx) => updateHandler(getDb(), req, (await ctx.params).id);
export const DELETE = async (req: Request, ctx: Ctx) => deleteHandler(getDb(), req, (await ctx.params).id);
