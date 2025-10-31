import { z } from "zod";

const requiredEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_BASEMAP_STYLE_URL: z.string().min(1),
  FEATURESERV_BASE: z.string().url(),
  TILESERV_BASE: z.string().url(),
  TITILER_BASE: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1)
});

const optionalEnvSchema = z.object({
  GEO_API_KEY: z.string().optional(),
  FEATURESERV_BBOX_CRS: z.enum(["CRS84", "EPSG:4326"]).optional()
});

const requiredEnvValues = requiredEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_BASEMAP_STYLE_URL: process.env.NEXT_PUBLIC_BASEMAP_STYLE_URL,
  FEATURESERV_BASE: process.env.FEATURESERV_BASE,
  TILESERV_BASE: process.env.TILESERV_BASE,
  TITILER_BASE: process.env.TITILER_BASE,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
});

if (!requiredEnvValues.success) {
  const missingKeys = requiredEnvValues.error.issues
    .map((issue) => issue.path[0])
    .filter((key): key is string => typeof key === "string");
  const uniqueMissingKeys = [...new Set(missingKeys)];
  const message = `Missing required environment variables: ${uniqueMissingKeys.join(", ")}`;

  throw new Error(message, { cause: requiredEnvValues.error });
}

const optionalEnvValues = optionalEnvSchema.safeParse({
  GEO_API_KEY: process.env.GEO_API_KEY,
  FEATURESERV_BBOX_CRS: process.env.FEATURESERV_BBOX_CRS
});

if (!optionalEnvValues.success) {
  throw optionalEnvValues.error;
}

export const env = {
  ...requiredEnvValues.data,
  GEO_API_KEY: optionalEnvValues.data.GEO_API_KEY,
  FEATURESERV_BBOX_CRS: optionalEnvValues.data.FEATURESERV_BBOX_CRS
};

const featureservBboxOptions = ["CRS84", "EPSG:4326"] as const;
const featureservBboxSchema = z.enum(featureservBboxOptions).optional();

const readOptionalFeatureServCrs = () => {
  const parsed = featureservBboxSchema.safeParse(process.env.FEATURESERV_BBOX_CRS);

  if (!parsed.success) {
    const validValues = featureservBboxOptions.join(", ");
    throw new Error(
      `Invalid FEATURESERV_BBOX_CRS value. Expected one of: ${validValues}. Received: ${process.env.FEATURESERV_BBOX_CRS}`,
      { cause: parsed.error }
    );
  }

  return parsed.data;
};

export type AppEnv = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  NEXT_PUBLIC_BASEMAP_STYLE_URL: string;
  FEATURESERV_BASE: string;
  TILESERV_BASE: string;
  TITILER_BASE: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  GEO_API_KEY?: string;
  FEATURESERV_BBOX_CRS?: "CRS84" | "EPSG:4326";
};

export const env: AppEnv = {
  get NEXT_PUBLIC_SUPABASE_URL() {
    return readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    return readRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get NEXT_PUBLIC_BASEMAP_STYLE_URL() {
    return readRequiredEnv("NEXT_PUBLIC_BASEMAP_STYLE_URL");
  },
  get FEATURESERV_BASE() {
    return readRequiredEnv("FEATURESERV_BASE");
  },
  get TILESERV_BASE() {
    return readRequiredEnv("TILESERV_BASE");
  },
  get TITILER_BASE() {
    return readRequiredEnv("TITILER_BASE");
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  },
  get GEO_API_KEY() {
    return isPresent(process.env.GEO_API_KEY) ? process.env.GEO_API_KEY : undefined;
  },
  get FEATURESERV_BBOX_CRS() {
    return readOptionalFeatureServCrs();
  }
};
