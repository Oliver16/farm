import { describe, expect, it } from "vitest";
import { createCogTileJsonUrl } from "./rasters";
import { registry } from "./index";

describe("raster config", () => {
  it("builds a TiTiler TileJSON URL from an s3 url", () => {
    const s3Url = "s3://rasters/path/to/ortho 2024.tif";
    const url = createCogTileJsonUrl(s3Url);
    const expectedBase = registry.env.TITILER_BASE.replace(/\/$/, "");
    expect(url).toBe(
      `${expectedBase}/cog/tilejson.json?url=${encodeURIComponent(s3Url)}`
    );
  });
});
