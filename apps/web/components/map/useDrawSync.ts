import { useEffect } from "react";
import type MapboxDraw from "maplibre-gl-draw";
import type { FeatureCollection } from "geojson";
import type { LayerId } from "../../lib/config";

export const useDrawSync = (
  drawRef: React.MutableRefObject<MapboxDraw | null>,
  featureCollection: FeatureCollection | undefined,
  activeLayerId: LayerId | null,
  setDrawDirty: (dirty: boolean) => void
) => {
  useEffect(() => {
    const draw = drawRef.current;
    if (!draw || !featureCollection) return;
    draw.deleteAll();
    featureCollection.features.forEach((feature) => {
      draw.add(feature);
    });
    setDrawDirty(false);
  }, [drawRef, featureCollection, activeLayerId, setDrawDirty]);
};
