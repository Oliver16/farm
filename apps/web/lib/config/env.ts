import { z } from "zod";

const requiredEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_BASEMAP_STYLE_URL: z.string().min(1),
  FEATURESERV_BASE: z.string().url(),
  TILESERV_BASE: z.string().url(),
  TITILER_BASE: z.string().url()
});

const optionalEnvSchema = z.object({
  GEO_API_KEY: z.string().optional()
});

const requiredEnvValues = requiredEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "dev-anon-key",
  NEXT_PUBLIC_BASEMAP_STYLE_URL:
    process.env.NEXT_PUBLIC_BASEMAP_STYLE_URL ?? "https://example.com/style.json",
  FEATURESERV_BASE: process.env.FEATURESERV_BASE ?? "https://example.com/features",
  TILESERV_BASE: process.env.TILESERV_BASE ?? "https://example.com/tiles",
  TITILER_BASE: process.env.TITILER_BASE ?? "https://example.com/titiler"
});

if (!requiredEnvValues.success) {
  throw requiredEnvValues.error;
}

const optionalEnvValues = optionalEnvSchema.safeParse({
  GEO_API_KEY: process.env.GEO_API_KEY
});

if (!optionalEnvValues.success) {
  throw optionalEnvValues.error;
}

export const env = {
  ...requiredEnvValues.data,
  GEO_API_KEY: optionalEnvValues.data.GEO_API_KEY
};

export type AppEnv = typeof env;
