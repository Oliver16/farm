import { z } from "zod";
import type { OrgRole } from "./orgs";

const orgRoleValues = ["owner", "admin", "editor", "viewer"] as const satisfies Readonly<OrgRole[]>;

export const createInviteSchema = z.object({
  email: z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional()
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: "Invalid email address"
    }),
  role: z.enum(orgRoleValues).default("viewer"),
  single_use: z.boolean().optional().default(true),
  expires_at: z.string().datetime({ offset: true }).optional()
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
