import { z } from "zod";
import type { Geometry } from "geojson";
import type { LayerDefinition } from "./config";

export const geometrySchema = z.object({
  type: z.enum(["Polygon", "MultiPolygon"]),
  coordinates: z.any()
});

export const featureSchema = z.object({
  type: z.literal("Feature"),
  geometry: geometrySchema,
  properties: z.record(z.any()).optional()
});

export const payloadSchema = z.object({
  feature: featureSchema,
  properties: z.object({
    org_id: z.string().uuid(),
    name: z.string().optional(),
    crop: z.string().optional(),
    btype: z.string().optional(),
    use_type: z.string().optional(),
    farm_id: z.string().uuid().optional(),
    building_id: z.string().uuid().optional(),
    greenhouse_id: z.string().uuid().optional(),
    bench_id: z.string().optional()
  })
});

const requiredFieldByLayer: Record<string, string[]> = {
  farms: ["name"],
  buildings: ["btype"],
  greenhouse_areas: ["use_type"]
};

export const validateFeaturePayload = (
  layer: LayerDefinition,
  geometry: Geometry,
  properties: Record<string, unknown>
) => {
  if (geometry.type !== layer.geomType && !(layer.geomType === "MultiPolygon" && geometry.type === "Polygon")) {
    throw new Error("GEOM_INVALID");
  }

  const payload = payloadSchema.parse({
    feature: {
      type: "Feature",
      geometry,
      properties
    },
    properties
  });

  const required = requiredFieldByLayer[layer.id] ?? [];
  for (const field of required) {
    const value = properties[field];
    if (!value) {
      throw new Error("VALIDATION_FAILED");
    }
  }

  if (!properties.org_id) {
    throw new Error("VALIDATION_FAILED");
  }

  return payload;
};
