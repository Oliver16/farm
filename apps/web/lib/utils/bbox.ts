import type { LngLatBoundsLike } from "maplibre-gl";

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

  const { _sw, _ne } = bounds as any;
  return [_sw.lng, _sw.lat, _ne.lng, _ne.lat];
};

export const bboxToQueryString = (bbox: BboxTuple): string =>
  bbox.map((value) => value.toFixed(6)).join(",");
