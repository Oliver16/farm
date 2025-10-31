import { z } from "zod";

const requiredEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_BASEMAP_STYLE_URL",
  "FEATURESERV_BASE",
  "TILESERV_BASE",
  "TITILER_BASE",
  "SUPABASE_SERVICE_ROLE_KEY"
] as const;

type RequiredEnvKey = (typeof requiredEnvKeys)[number];

const isPresent = (value: string | undefined | null): value is string =>
  typeof value === "string" && value.length > 0;

const missingRequiredEnvMessage = () => {
  const missingKeys = requiredEnvKeys.filter((key) => !isPresent(process.env[key]));

  if (missingKeys.length === 0) {
    return null;
  }

  return `Missing required environment variables: ${missingKeys.join(", ")}`;
};

const readRequiredEnv = (key: RequiredEnvKey): string => {
  const value = process.env[key];
  if (isPresent(value)) {
    return value;
  }

  const message = missingRequiredEnvMessage();
  throw new Error(message ?? `Missing required environment variable: ${key}`);
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
