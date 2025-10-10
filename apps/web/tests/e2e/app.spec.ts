import { test, expect } from "@playwright/test";

test.describe.skip("Geospatial editing flow", () => {
  test("user can draw, save, and delete a feature", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Farm Geospatial Console")).toBeVisible();

    await page.getByRole("button", { name: "Draw" }).click();
    await page.mouse.click(400, 300);
    await page.mouse.click(450, 320);
    await page.mouse.click(420, 360);
    await page.mouse.click(400, 300);

    await page.getByLabel("Name").fill("Demo Feature");
    await page.getByRole("button", { name: "Save Attributes" }).click();
    await expect(page.getByText("Feature saved")).toBeVisible();

    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Feature saved")).toBeVisible();
  });
});
