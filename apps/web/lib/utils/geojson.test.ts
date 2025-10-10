import { describe, expect, it } from "vitest";
import type { FeatureCollection } from "geojson";
import { getFeatureCollectionBounds } from "./geojson";

const collectionFromGeometry = (geometry: FeatureCollection["features"][number]["geometry"]) => ({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: null,
      geometry
    }
  ]
}) satisfies FeatureCollection;

describe("getFeatureCollectionBounds", () => {
  it("returns null when no geometries are present", () => {
    const empty: FeatureCollection = { type: "FeatureCollection", features: [] };

    expect(getFeatureCollectionBounds(empty)).toBeNull();
  });

  it("returns bounds for a polygon", () => {
    const polygon = collectionFromGeometry({
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0]
        ]
      ]
    });

    expect(getFeatureCollectionBounds(polygon)).toEqual([
      [0, 0],
      [1, 1]
    ]);
  });

  it("handles multipolygons", () => {
    const multiPolygon = collectionFromGeometry({
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0]
          ]
        ],
        [
          [
            [2, 2],
            [3, 2],
            [3, 3],
            [2, 3],
            [2, 2]
          ]
        ]
      ]
    });

    expect(getFeatureCollectionBounds(multiPolygon)).toEqual([
      [0, 0],
      [3, 3]
    ]);
  });

  it("ignores invalid coordinates", () => {
    const polygon = collectionFromGeometry({
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, Number.NaN],
          [Number.POSITIVE_INFINITY, 1],
          [0, 1],
          [0, 0]
        ]
      ]
    });

    expect(getFeatureCollectionBounds(polygon)).toEqual([
      [0, 0],
      [0, 1]
    ]);
  });
});
