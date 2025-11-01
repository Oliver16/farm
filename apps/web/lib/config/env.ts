import { z } from "zod";

const requiredEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_BASEMAP_STYLE_URL",
  "FEATURESERV_BASE",
  "TILESERV_BASE",
  "TITILER_BASE"
] as const;

const featureservBboxOptions = ["CRS84", "EPSG:4326"] as const;
const featureservBboxSchema = z.enum(featureservBboxOptions);

type RequiredEnvKey = (typeof requiredEnvKeys)[number];
type EnvKey =
  | RequiredEnvKey
  | "GEO_API_KEY"
  | "FEATURESERV_BBOX_CRS"
  | "SUPABASE_SERVICE_ROLE_KEY"; // optional (server-only)

export type AppEnv = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  NEXT_PUBLIC_BASEMAP_STYLE_URL: string;
  FEATURESERV_BASE: string;
  TILESERV_BASE: string;
  TITILER_BASE: string;
  SUPABASE_SERVICE_ROLE_KEY?: string; // <-- optional now
  GEO_API_KEY?: string;
  FEATURESERV_BBOX_CRS?: (typeof featureservBboxOptions)[number];
};

const overrides: Partial<Record<EnvKey, AppEnv[EnvKey]>> = {};
const hasOverride = (k: EnvKey) => Object.prototype.hasOwnProperty.call(overrides, k);
const isPresent = (v: unknown): v is string => typeof v === "string" && v.length > 0;

/** Static capture so Next.js inlines public envs client-side (+ fallback to SUPABASE_*). */
const STATIC_PUBLIC = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY,
  NEXT_PUBLIC_BASEMAP_STYLE_URL: process.env.NEXT_PUBLIC_BASEMAP_STYLE_URL
} as const;

const readRequiredEnv = (key: RequiredEnvKey): string => {
  if (hasOverride(key)) {
    const v = overrides[key];
    if (!isPresent(v)) throw new Error(`Missing required environment variable: ${key}`);
    return v;
  }
  // Public keys: read from static capture (works in browser bundle)
  if (Object.prototype.hasOwnProperty.call(STATIC_PUBLIC, key)) {
    const v = (STATIC_PUBLIC as Record<string, string | undefined>)[key];
    if (!isPresent(v)) throw new Error(`Missing required environment variable: ${key}`);
    return v;
  }
  // Server-only required keys: read dynamically at runtime
  const raw = process.env[key];
  if (!isPresent(raw)) throw new Error(`Missing required environment variable: ${key}`);
  return raw;
};

const readGeoApiKey = (): string | undefined =>
  hasOverride("GEO_API_KEY") ? (overrides.GEO_API_KEY as string | undefined) : process.env.GEO_API_KEY || undefined;

const parseFeatureServCrs = (v: string | undefined): AppEnv["FEATURESERV_BBOX_CRS"] => {
  if (!isPresent(v)) return undefined;
  const parsed = featureservBboxSchema.safeParse(v);
  if (!parsed.success) {
    const valid = featureservBboxOptions.join(", ");
    throw new Error(
      `Invalid FEATURESERV_BBOX_CRS value. Expected one of: ${valid}. Received: ${v}`
    );
  }
  return parsed.data;
};
const readFeatureServCrs = (): AppEnv["FEATURESERV_BBOX_CRS"] =>
  hasOverride("FEATURESERV_BBOX_CRS")
    ? (overrides.FEATURESERV_BBOX_CRS as AppEnv["FEATURESERV_BBOX_CRS"])
    : parseFeatureServCrs(process.env.FEATURESERV_BBOX_CRS);

const setRequiredOverride = (k: RequiredEnvKey, v: string) => {
  if (!isPresent(v)) throw new Error(`Missing required environment variable: ${k}`);
  overrides[k] = v;
};
const clearOverride = (k: EnvKey) => { delete overrides[k]; };
const setGeoApiOverride = (v: string | undefined) => {
  if (v === undefined) return clearOverride("GEO_API_KEY");
  if (!isPresent(v)) throw new Error("GEO_API_KEY cannot be empty");
  overrides.GEO_API_KEY = v;
};
const setFeatureServCrsOverride = (v: AppEnv["FEATURESERV_BBOX_CRS"]) => {
  if (v === undefined) return clearOverride("FEATURESERV_BBOX_CRS");
  const parsed = featureservBboxSchema.safeParse(v);
  if (!parsed.success) {
    const valid = featureservBboxOptions.join(", ");
    throw new Error(
      `Invalid FEATURESERV_BBOX_CRS value. Expected one of: ${valid}. Received: ${String(v)}`
    );
  }
  overrides.FEATURESERV_BBOX_CRS = parsed.data;
};

// NEW: optional reader for service role key (never throws here)
const readServiceRoleKey = (): string | undefined =>
  hasOverride("SUPABASE_SERVICE_ROLE_KEY")
    ? (overrides.SUPABASE_SERVICE_ROLE_KEY as string | undefined)
    : process.env.SUPABASE_SERVICE_ROLE_KEY || undefined;

const env = {} as AppEnv;

Object.defineProperties(env, {
  NEXT_PUBLIC_SUPABASE_URL: {
    enumerable: true, configurable: true,
    get() { return readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"); },
    set(v: string) { setRequiredOverride("NEXT_PUBLIC_SUPABASE_URL", v); }
  },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    enumerable: true, configurable: true,
    get() { return readRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"); },
    set(v: string) { setRequiredOverride("NEXT_PUBLIC_SUPABASE_ANON_KEY", v); }
  },
  NEXT_PUBLIC_BASEMAP_STYLE_URL: {
    enumerable: true, configurable: true,
    get() { return readRequiredEnv("NEXT_PUBLIC_BASEMAP_STYLE_URL"); },
    set(v: string) { setRequiredOverride("NEXT_PUBLIC_BASEMAP_STYLE_URL", v); }
  },
  FEATURESERV_BASE: {
    enumerable: true, configurable: true,
    get() { return readRequiredEnv("FEATURESERV_BASE"); },
    set(v: string) { setRequiredOverride("FEATURESERV_BASE", v); }
  },
  TILESERV_BASE: {
    enumerable: true, configurable: true,
    get() { return readRequiredEnv("TILESERV_BASE"); },
    set(v: string) { setRequiredOverride("TILESERV_BASE", v); }
  },
  TITILER_BASE: {
    enumerable: true, configurable: true,
    get() { return readRequiredEnv("TITILER_BASE"); },
    set(v: string) { setRequiredOverride("TITILER_BASE", v); }
  },
  // OPTIONAL: do not throw from the registry on missing service role
  SUPABASE_SERVICE_ROLE_KEY: {
    enumerable: true, configurable: true,
    get() { return readServiceRoleKey(); },
    set(v: string | undefined) {
      if (v === undefined) return clearOverride("SUPABASE_SERVICE_ROLE_KEY");
      if (!isPresent(v)) throw new Error("SUPABASE_SERVICE_ROLE_KEY cannot be empty");
      overrides.SUPABASE_SERVICE_ROLE_KEY = v;
    }
  },
  GEO_API_KEY: {
    enumerable: true, configurable: true,
    get() { return readGeoApiKey(); },
    set(v: string | undefined) { setGeoApiOverride(v); }
  },
  FEATURESERV_BBOX_CRS: {
    enumerable: true, configurable: true,
    get() { return readFeatureServCrs(); },
    set(v: AppEnv["FEATURESERV_BBOX_CRS"]) { setFeatureServCrsOverride(v); }
  }
});

export { env };
