import { useEffect } from "react";
import type maplibregl from "maplibre-gl";
import { jsonFetcher } from "../../lib/fetcher";
import { registry } from "../../lib/config";

export const useRasterVisibility = (
  mapRef: React.MutableRefObject<maplibregl.Map | null>,
  rasterVisibility: Record<string, boolean>,
  activeOrgId: string | null,
  pushToastRef: React.MutableRefObject<
    ((payload: { type: "error" | "success" | "info"; message: string }) => void) | undefined
  >
) => {
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeOrgId) return;
    registry.rasterList.forEach(async (raster) => {
      const layerId = `raster-${raster.id}`;
      if (rasterVisibility[raster.id]) {
        try {
          if (!map.getSource(layerId)) {
            const tilejson = await jsonFetcher<{ tiles: string[]; tileSize?: number }>(
              `${raster.tilejsonRoute}?org_id=${activeOrgId}`
            );
            map.addSource(layerId, {
              type: "raster",
              tiles: tilejson.tiles,
              tileSize: tilejson.tileSize ?? 256
            });
            map.addLayer({
              id: layerId,
              type: "raster",
              source: layerId,
              paint: { "raster-opacity": 0.75 }
            });
          } else if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, "visibility", "visible");
          }
        } catch (error) {
          pushToastRef.current?.({
            type: "error",
            message: (error as Error).message
          });
        }
      } else if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", "none");
      }
    });
  }, [activeOrgId, mapRef, pushToastRef, rasterVisibility]);
};
