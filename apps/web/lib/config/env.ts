import { z } from "zod";

const requiredEnvReaders = {
  NEXT_PUBLIC_SUPABASE_URL: () => process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_BASEMAP_STYLE_URL: () => process.env.NEXT_PUBLIC_BASEMAP_STYLE_URL,
  FEATURESERV_BASE: () => process.env.FEATURESERV_BASE,
  TILESERV_BASE: () => process.env.TILESERV_BASE,
  TITILER_BASE: () => process.env.TITILER_BASE,
  SUPABASE_SERVICE_ROLE_KEY: () => process.env.SUPABASE_SERVICE_ROLE_KEY
} as const;

const requiredEnvKeys = Object.keys(requiredEnvReaders) as Array<
  keyof typeof requiredEnvReaders
>;

type RequiredEnvKey = keyof typeof requiredEnvReaders;

const requiredEnvValues = requiredEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_BASEMAP_STYLE_URL: process.env.NEXT_PUBLIC_BASEMAP_STYLE_URL,
  FEATURESERV_BASE: process.env.FEATURESERV_BASE,
  TILESERV_BASE: process.env.TILESERV_BASE,
  TITILER_BASE: process.env.TITILER_BASE,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
});

const missingRequiredEnvMessage = () => {
  const missingKeys = requiredEnvKeys.filter((key) => !isPresent(requiredEnvReaders[key]()));

  throw new Error(message, { cause: requiredEnvValues.error });
}

const optionalEnvValues = optionalEnvSchema.safeParse({
  GEO_API_KEY: process.env.GEO_API_KEY,
  FEATURESERV_BBOX_CRS: process.env.FEATURESERV_BBOX_CRS
});

const readRequiredEnv = (key: RequiredEnvKey): string => {
  const value = requiredEnvReaders[key]();
  if (isPresent(value)) {
    return value;
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

const env = {} as AppEnv;

const defineRequiredProperty = (key: RequiredEnvKey) => ({
  get(): string {
    return readRequiredEnv(key);
  },
  set(value: string) {
    process.env[key] = value;
  },
  enumerable: true
});

Object.defineProperties(env, {
  NEXT_PUBLIC_SUPABASE_URL: defineRequiredProperty("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: defineRequiredProperty("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  NEXT_PUBLIC_BASEMAP_STYLE_URL: defineRequiredProperty("NEXT_PUBLIC_BASEMAP_STYLE_URL"),
  FEATURESERV_BASE: defineRequiredProperty("FEATURESERV_BASE"),
  TILESERV_BASE: defineRequiredProperty("TILESERV_BASE"),
  TITILER_BASE: defineRequiredProperty("TITILER_BASE"),
  SUPABASE_SERVICE_ROLE_KEY: defineRequiredProperty("SUPABASE_SERVICE_ROLE_KEY"),
  GEO_API_KEY: {
    get(): string | undefined {
      return isPresent(process.env.GEO_API_KEY) ? process.env.GEO_API_KEY : undefined;
    },
    set(value: string | undefined) {
      if (typeof value === "string") {
        process.env.GEO_API_KEY = value;
      } else {
        delete process.env.GEO_API_KEY;
      }
    },
    enumerable: true
  },
  FEATURESERV_BBOX_CRS: {
    get(): "CRS84" | "EPSG:4326" | undefined {
      return readOptionalFeatureServCrs();
    },
    set(value: "CRS84" | "EPSG:4326" | undefined) {
      if (typeof value === "string") {
        process.env.FEATURESERV_BBOX_CRS = value;
      } else {
        delete process.env.FEATURESERV_BBOX_CRS;
      }
    },
    enumerable: true
  }
});

export { env };
