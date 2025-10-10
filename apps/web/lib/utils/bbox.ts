import type { LngLatBounds, LngLatBoundsLike } from "maplibre-gl";

export type BboxTuple = [number, number, number, number];

export const boundsToTuple = (bounds: LngLatBoundsLike): BboxTuple => {
  if (Array.isArray(bounds)) {
    if (bounds.length === 4) {
      return bounds as BboxTuple;
    }
    const [[minLng, minLat], [maxLng, maxLat]] = bounds as [
      [number, number],
      [number, number]
    ];
    return [minLng, minLat, maxLng, maxLat];
  }

  const mapBounds = bounds as LngLatBounds;
  const southWest = mapBounds.getSouthWest();
  const northEast = mapBounds.getNorthEast();
  return [southWest.lng, southWest.lat, northEast.lng, northEast.lat];
};

export const bboxToQueryString = (bbox: BboxTuple): string =>
  bbox.map((value) => value.toFixed(6)).join(",");
