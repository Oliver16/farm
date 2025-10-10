import { useEffect } from "react";
import type maplibregl from "maplibre-gl";
import { registry, type LayerId } from "../../lib/config";

export const useLayerVisibility = (
  mapRef: React.MutableRefObject<maplibregl.Map | null>,
  layerVisibility: Record<LayerId, boolean>
) => {
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    registry.layerList.forEach((layer) => {
      const visibility = layerVisibility[layer.id] ? "visible" : "none";
      if (map.getLayer(`${layer.id}-fill`)) {
        map.setLayoutProperty(`${layer.id}-fill`, "visibility", visibility);
      }
      if (map.getLayer(`${layer.id}-line`)) {
        map.setLayoutProperty(`${layer.id}-line`, "visibility", visibility);
      }
    });
  }, [layerVisibility, mapRef]);
};
