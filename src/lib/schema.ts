import { z } from "zod";

export const STATUSES = ["wishlist", "applied", "interview", "offer", "rejected"] as const;
export type Status = (typeof STATUSES)[number];

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
  }, "Not a real calendar date");

const text = (max: number) => z.string().trim().max(max);

const fields = z.object({
  company: text(120).min(1, "Company is required"),
  role: text(120).min(1, "Role is required"),
  status: z.enum(STATUSES),
  deadline: dateOnly.nullable().optional(),
  url: z
    .string()
    .trim()
    .max(500)
    .refine((u) => u === "" || /^https?:\/\//i.test(u), "URL must start with http:// or https://")
    .optional(),
  notes: text(2000).optional(),
});

// A new application starts on the wishlist. The patch schema must NOT inherit that default,
// otherwise editing only the notes would silently reset the status.
export const applicationInput = fields.extend({ status: z.enum(STATUSES).default("wishlist") });
export const applicationPatch = fields.partial();

export const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export type ApplicationInput = z.infer<typeof applicationInput>;
export type ApplicationPatch = z.infer<typeof applicationPatch>;

export interface Application {
  id: number;
  company: string;
  role: string;
  status: Status;
  deadline: string | null;
  url: string;
  notes: string;
  created_at: string;
  updated_at: string;
}
