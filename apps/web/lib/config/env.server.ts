import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1)
});

const serverEnvValues = serverEnvSchema.safeParse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
});

if (!serverEnvValues.success) {
  throw serverEnvValues.error;
}

export const serverEnv = serverEnvValues.data;

export type ServerEnv = typeof serverEnv;
