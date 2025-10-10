import { describe, expect, it } from "vitest";
import { registry } from "./config";
import { validateFeaturePayload } from "./validation";

const layer = registry.vectorLayers.farms;

describe("validateFeaturePayload", () => {
  it("validates a correct payload", () => {
    const payload = validateFeaturePayload(
      layer,
      {
        type: "MultiPolygon",
        coordinates: []
      },
      { org_id: "11111111-1111-1111-1111-111111111111", name: "Demo" }
    );
    expect(payload.properties.org_id).toBeDefined();
  });

  it("throws on missing required field", () => {
    expect(() =>
      validateFeaturePayload(
        layer,
        { type: "MultiPolygon", coordinates: [] },
        { org_id: "11111111-1111-1111-1111-111111111111" }
      )
    ).toThrowError("VALIDATION_FAILED");
  });
});
