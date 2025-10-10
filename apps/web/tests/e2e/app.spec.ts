import { test, expect } from "@playwright/test";

test.describe.skip("Geospatial integrations", () => {
  test("loads MapTiler basemap style", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();
    // TODO: add network assertion for MapTiler style.json once backend fixtures are available.
  });

  test("toggles Ortho and DEM rasters via TileJSON proxy", async ({ page }) => {
    await page.goto("/");

    // TODO: mock /api/rasters responses and verify raster layers render via MapLibre.
    await expect(page.getByText("Rasters")).toBeVisible();
    await expect(page.getByLabel("Orthophoto")).toBeVisible();
    await expect(page.getByLabel("DEM Hillshade")).toBeVisible();
  });

  test("renders vector layers and fetches feature details", async ({ page }) => {
    await page.goto("/");

    // TODO: stub pg_tileserv and pg_featureserv responses to validate identify workflow.
    await expect(page.getByText("Layers")).toBeVisible();
  });
});
