import { z } from "zod";

const requiredEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_BASEMAP_STYLE_URL: z.string().min(1),
  FEATURESERV_BASE: z.string().url(),
  TILESERV_BASE: z.string().url(),
  TITILER_BASE: z.string().url(),
  PMTILES_BASE: z.string().url()
});

const optionalEnvSchema = z.object({
  GEO_API_KEY: z.string().optional()
});

export const env = {
  ...requiredEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_BASEMAP_STYLE_URL: process.env.NEXT_PUBLIC_BASEMAP_STYLE_URL,
    FEATURESERV_BASE: process.env.FEATURESERV_BASE,
    TILESERV_BASE: process.env.TILESERV_BASE,
    TITILER_BASE: process.env.TITILER_BASE,
    PMTILES_BASE: process.env.PMTILES_BASE
  }),
  ...optionalEnvSchema.parse({
    GEO_API_KEY: process.env.GEO_API_KEY
  })
};

export type AppEnv = typeof env;
