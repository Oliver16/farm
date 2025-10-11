import { useCallback, useState } from "react";
import type { FeatureCollection } from "geojson";
import useSWR from "swr";
import type maplibregl from "maplibre-gl";
import { registry, type LayerId } from "../../lib/config";
import { bboxToQueryString, boundsToTuple } from "../../lib/utils/bbox";
import { jsonFetcher } from "../../lib/fetcher";

export const useFeatureFetcher = (
  activeLayerId: LayerId | null,
  activeOrgId: string | null
) => {
  const [bboxParam, setBboxParam] = useState<string | null>(null);

  const layerConfig = activeLayerId ? registry.vectorLayers[activeLayerId] : null;

  const featuresKey =
    layerConfig && activeOrgId && bboxParam
      ? `/api/features/${layerConfig.collectionId}?org_id=${activeOrgId}&bbox=${bboxParam}&limit=500`
      : null;

  const { data: featureCollection, mutate } = useSWR<FeatureCollection>(
    featuresKey,
    jsonFetcher
  );

  const updateBounds = useCallback((bounds: maplibregl.LngLatBounds) => {
    const tuple = boundsToTuple([
      [bounds.getWest(), bounds.getSouth()],
      [bounds.getEast(), bounds.getNorth()]
    ]);
    setBboxParam(bboxToQueryString(tuple));
  }, []);

  return { featureCollection, mutate, updateBounds };
};
