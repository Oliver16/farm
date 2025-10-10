import type { FeatureCollection, Geometry, Position } from "geojson";

type LngLat = [number, number];
export type BoundsTuple = [LngLat, LngLat];

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isPosition = (value: unknown): value is Position =>
  Array.isArray(value) && isFiniteNumber(value[0]) && isFiniteNumber(value[1]);

const extendBounds = (position: Position, bounds: BoundsTuple) => {
  const [lng, lat] = position;
  const [[minLng, minLat], [maxLng, maxLat]] = bounds;

  bounds[0][0] = Math.min(minLng, lng);
  bounds[0][1] = Math.min(minLat, lat);
  bounds[1][0] = Math.max(maxLng, lng);
  bounds[1][1] = Math.max(maxLat, lat);
};

const traverseCoordinates = (coordinates: unknown, bounds: BoundsTuple) => {
  if (isPosition(coordinates)) {
    extendBounds(coordinates, bounds);
    return;
  }

  if (Array.isArray(coordinates)) {
    coordinates.forEach((value) => traverseCoordinates(value, bounds));
  }
};

const updateBoundsFromGeometry = (geometry: Geometry | null, bounds: BoundsTuple) => {
  if (!geometry) return;

  switch (geometry.type) {
    case "GeometryCollection": {
      geometry.geometries.forEach((child) => updateBoundsFromGeometry(child, bounds));
      break;
    }
    case "Point":
    case "MultiPoint":
    case "LineString":
    case "MultiLineString":
    case "Polygon":
    case "MultiPolygon": {
      traverseCoordinates(geometry.coordinates, bounds);
      break;
    }
    default:
      break;
  }
};

export const getFeatureCollectionBounds = (
  featureCollection: FeatureCollection
): BoundsTuple | null => {
  const bounds: BoundsTuple = [
    [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
    [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]
  ];

  featureCollection.features.forEach((feature) => {
    updateBoundsFromGeometry(feature.geometry ?? null, bounds);
  });

  const [[minLng, minLat], [maxLng, maxLat]] = bounds;

  if (
    !isFiniteNumber(minLng) ||
    !isFiniteNumber(minLat) ||
    !isFiniteNumber(maxLng) ||
    !isFiniteNumber(maxLat)
  ) {
    return null;
  }

  return bounds;
};
