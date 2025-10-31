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

const featureservBboxOptions = ["CRS84", "EPSG:4326"] as const;
const featureservBboxSchema = z.enum(featureservBboxOptions);

type RequiredEnvKey = (typeof requiredEnvKeys)[number];

type EnvKey =
  | RequiredEnvKey
  | "GEO_API_KEY"
  | "FEATURESERV_BBOX_CRS";

type FeatureServBboxCrs = (typeof featureservBboxOptions)[number];

export type AppEnv = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  NEXT_PUBLIC_BASEMAP_STYLE_URL: string;
  FEATURESERV_BASE: string;
  TILESERV_BASE: string;
  TITILER_BASE: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  GEO_API_KEY?: string;
  FEATURESERV_BBOX_CRS?: FeatureServBboxCrs;
};

const overrides: Partial<Record<EnvKey, AppEnv[EnvKey]>> = {};

const hasOverride = (key: EnvKey) => Object.prototype.hasOwnProperty.call(overrides, key);

const isPresent = (value: unknown): value is string => typeof value === "string" && value.length > 0;

const readRequiredEnv = (key: RequiredEnvKey): string => {
  if (hasOverride(key)) {
    const value = overrides[key];
    if (!isPresent(value)) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  const raw = process.env[key];
  if (!isPresent(raw)) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return raw;
};

const readGeoApiKey = (): string | undefined => {
  if (hasOverride("GEO_API_KEY")) {
    return overrides.GEO_API_KEY;
  }

  const raw = process.env.GEO_API_KEY;
  return isPresent(raw) ? raw : undefined;
};

const parseFeatureServCrs = (value: string | undefined): AppEnv["FEATURESERV_BBOX_CRS"] => {
  if (!isPresent(value)) {
    return undefined;
  }

  const parsed = featureservBboxSchema.safeParse(value);

  if (!parsed.success) {
    const validValues = featureservBboxOptions.join(", ");
    throw new Error(
      `Invalid FEATURESERV_BBOX_CRS value. Expected one of: ${validValues}. Received: ${value}`,
      { cause: parsed.error }
    );
  }

  return parsed.data;
};

const readFeatureServCrs = (): AppEnv["FEATURESERV_BBOX_CRS"] => {
  if (hasOverride("FEATURESERV_BBOX_CRS")) {
    return overrides.FEATURESERV_BBOX_CRS as AppEnv["FEATURESERV_BBOX_CRS"];
  }

  return parseFeatureServCrs(process.env.FEATURESERV_BBOX_CRS);
};

const setRequiredOverride = (key: RequiredEnvKey, value: string) => {
  if (!isPresent(value)) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  overrides[key] = value;
};

const clearOverride = (key: EnvKey) => {
  delete overrides[key];
};

const setGeoApiOverride = (value: string | undefined) => {
  if (value === undefined) {
    clearOverride("GEO_API_KEY");
    return;
  }

  if (!isPresent(value)) {
    throw new Error("GEO_API_KEY cannot be empty");
  }

  overrides.GEO_API_KEY = value;
};

const setFeatureServCrsOverride = (value: AppEnv["FEATURESERV_BBOX_CRS"]) => {
  if (value === undefined) {
    clearOverride("FEATURESERV_BBOX_CRS");
    return;
  }

  const parsed = featureservBboxSchema.safeParse(value);
  if (!parsed.success) {
    const validValues = featureservBboxOptions.join(", ");
    throw new Error(
      `Invalid FEATURESERV_BBOX_CRS value. Expected one of: ${validValues}. Received: ${value}`,
      { cause: parsed.error }
    );
  }

  overrides.FEATURESERV_BBOX_CRS = parsed.data;
};

const env = {} as AppEnv;

Object.defineProperties(env, {
  NEXT_PUBLIC_SUPABASE_URL: {
    enumerable: true,
    configurable: true,
    get() {
      return readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    },
    set(value: string) {
      setRequiredOverride("NEXT_PUBLIC_SUPABASE_URL", value);
    }
  },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    enumerable: true,
    configurable: true,
    get() {
      return readRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    },
    set(value: string) {
      setRequiredOverride("NEXT_PUBLIC_SUPABASE_ANON_KEY", value);
    }
  },
  NEXT_PUBLIC_BASEMAP_STYLE_URL: {
    enumerable: true,
    configurable: true,
    get() {
      return readRequiredEnv("NEXT_PUBLIC_BASEMAP_STYLE_URL");
    },
    set(value: string) {
      setRequiredOverride("NEXT_PUBLIC_BASEMAP_STYLE_URL", value);
    }
  },
  FEATURESERV_BASE: {
    enumerable: true,
    configurable: true,
    get() {
      return readRequiredEnv("FEATURESERV_BASE");
    },
    set(value: string) {
      setRequiredOverride("FEATURESERV_BASE", value);
    }
  },
  TILESERV_BASE: {
    enumerable: true,
    configurable: true,
    get() {
      return readRequiredEnv("TILESERV_BASE");
    },
    set(value: string) {
      setRequiredOverride("TILESERV_BASE", value);
    }
  },
  TITILER_BASE: {
    enumerable: true,
    configurable: true,
    get() {
      return readRequiredEnv("TITILER_BASE");
    },
    set(value: string) {
      setRequiredOverride("TITILER_BASE", value);
    }
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    enumerable: true,
    configurable: true,
    get() {
      return readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    },
    set(value: string) {
      setRequiredOverride("SUPABASE_SERVICE_ROLE_KEY", value);
    }
  },
  GEO_API_KEY: {
    enumerable: true,
    configurable: true,
    get() {
      return readGeoApiKey();
    },
    set(value: string | undefined) {
      setGeoApiOverride(value);
    }
  },
  FEATURESERV_BBOX_CRS: {
    enumerable: true,
    configurable: true,
    get() {
      return readFeatureServCrs();
    },
    set(value: AppEnv["FEATURESERV_BBOX_CRS"]) {
      setFeatureServCrsOverride(value);
    }
  }
});

export { env };
