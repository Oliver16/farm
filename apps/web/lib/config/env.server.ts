import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1)
});

export type AppServerEnv = z.infer<typeof serverEnvSchema>;

const parseServerEnv = (): AppServerEnv => {
  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  });

  if (!parsed.success) {
    const missingKeys = parsed.error.issues
      .map((issue) => issue.path[0])
      .filter((key): key is string => typeof key === "string");
    const uniqueMissingKeys = [...new Set(missingKeys)];
    const message = `Missing required server environment variables: ${uniqueMissingKeys.join(", ")}`;

    throw new Error(message, { cause: parsed.error });
  }

  return parsed.data;
};

export const getServerEnv = (): AppServerEnv => parseServerEnv();
