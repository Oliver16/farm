import { useCallback, useRef, useState } from "react";
import type { FeatureCollection } from "geojson";
import useSWR from "swr";
import type maplibregl from "maplibre-gl";
import { registry, type LayerId } from "../../lib/config";
import { bboxToQueryString, type BboxTuple } from "../../lib/utils/bbox";

const PAGE_LIMIT = 200;
const MIN_FETCH_ZOOM = 10; // avoid huge bboxes
const MAX_DEG2 = 25; // area guard (deg^2)
const now = () => Date.now();

export const useFeatureFetcher = (
  activeLayerId: LayerId | null,
  activeOrgId: string | null
) => {
  const [key, setKey] = useState<string | null>(null);
  const inflight = useRef<AbortController | null>(null);
  const lastSet = useRef(0);

  const layerConfig = activeLayerId ? registry.vectorLayers[activeLayerId] : null;

  const { data: featureCollection, mutate } = useSWR<FeatureCollection>(key, async (url: string) => {
    if (inflight.current) inflight.current.abort();
    const ac = new AbortController();
    inflight.current = ac;
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || res.statusText);
    }
    return res.json();
  });

  const updateBounds = useCallback(
    (bounds: maplibregl.LngLatBounds, zoom?: number) => {
      if (!layerConfig || !activeOrgId) return;

      const z = typeof zoom === "number" ? zoom : undefined;
      if (z !== undefined && z < MIN_FETCH_ZOOM) {
        setKey(null);
        return;
      }

      const [[minX, minY], [maxX, maxY]] = [
        [bounds.getWest(), bounds.getSouth()],
        [bounds.getEast(), bounds.getNorth()]
      ];
      // area guard
      const areaDeg2 = Math.max(0, maxX - minX) * Math.max(0, maxY - minY);
      if (areaDeg2 > MAX_DEG2) {
        setKey(null);
        return;
      }

      const bbox: BboxTuple = [minX, minY, maxX, maxY];
      const bboxParam = bboxToQueryString(bbox);
      const url =
        `/api/features/${layerConfig.collectionId}` +
        `?org_id=${activeOrgId}` +
        `&bbox=${bboxParam}` +
        `&bbox-crs=EPSG:4326` +
        `&limit=${PAGE_LIMIT}`;

      // coalesce rapid updates to avoid hammering server
      const t = now();
      if (t - lastSet.current < 250) return;
      lastSet.current = t;
      setKey(url);
    },
    [activeOrgId, layerConfig]
  );

  return { featureCollection, mutate, updateBounds };
};
