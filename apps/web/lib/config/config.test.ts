import { describe, expect, it } from "vitest";
import { registry } from "./index";

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
    expect(registry.env.PMTILES_BASE).toBeTruthy();
  });
});
