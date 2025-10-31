import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registry } from "./index";
import { getServerEnv } from "./env.server";

const SERVICE_ROLE_KEY = "service-role";
const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

beforeAll(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_ROLE_KEY;
});

afterAll(() => {
  if (originalServiceRoleKey === undefined) {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  } else {
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
  }
});

describe("layer registry", () => {
  it("uses unique layer identifiers", () => {
    const ids = registry.layerList.map((layer) => layer.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("includes required environment variables", () => {
    expect(registry.env.NEXT_PUBLIC_SUPABASE_URL).toBeTruthy();
    expect(registry.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeTruthy();
    expect(registry.env.NEXT_PUBLIC_BASEMAP_STYLE_URL).toBeTruthy();
    expect(registry.env.FEATURESERV_BASE).toBeTruthy();
    expect(registry.env.TILESERV_BASE).toBeTruthy();
    expect(registry.env.TITILER_BASE).toBeTruthy();
    expect(getServerEnv().SUPABASE_SERVICE_ROLE_KEY).toBe(SERVICE_ROLE_KEY);
  });
});
