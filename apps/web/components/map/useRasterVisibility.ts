import { useEffect } from "react";
import type maplibregl from "maplibre-gl";
import { jsonFetcher } from "../../lib/fetcher";
import { registry, type RasterDefinition, type RasterId } from "../../lib/config";

type TileJson = {
  tiles?: string[];
  tileSize?: number;
  minzoom?: number;
  maxzoom?: number;
};

type AvailableRaster = RasterDefinition & { acquiredAt?: string | null };

const tilejsonCache = new Map<string, Promise<TileJson>>();

const getTilejson = (rasterId: RasterId, orgId: string, url: string) => {
  const cacheKey = `${rasterId}:${orgId}`;
  const existing = tilejsonCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const request = jsonFetcher<TileJson>(`${url}?org_id=${orgId}`)
    .then((response) => response)
    .catch((error) => {
      tilejsonCache.delete(cacheKey);
      throw error;
    });

  tilejsonCache.set(cacheKey, request);
  return request;
};

export const useRasterVisibility = (
  mapRef: React.MutableRefObject<maplibregl.Map | null>,
  rasters: AvailableRaster[],
  rasterVisibility: Record<RasterId, boolean>,
  activeOrgId: string | null,
  pushToastRef: React.MutableRefObject<
    ((payload: { type: "error" | "success" | "info"; message: string }) => void) | undefined
  >
) => {
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const removeRaster = (rasterId: RasterId) => {
      const sourceId = `raster-${rasterId}`;
      const layerId = `${sourceId}-layer`;
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
      if (activeOrgId) {
        tilejsonCache.delete(`${rasterId}:${activeOrgId}`);
      }
    };

    const removeAllRasters = () => {
      const style = map.getStyle();
      const sources = style?.sources ? Object.keys(style.sources) : [];
      sources
        .filter((sourceId) => sourceId.startsWith("raster-"))
        .forEach((sourceId) => {
          const rasterId = sourceId.replace(/^raster-/, "") as RasterId;
          removeRaster(rasterId);
        });
      if (!activeOrgId) {
        tilejsonCache.clear();
      }
    };

    if (!activeOrgId) {
      removeAllRasters();
      return;
    }

    const applyVisibility = () => {
      const availableIds = new Set(rasters.map((raster) => raster.id));

      const style = map.getStyle();
      const sources = style?.sources ? Object.keys(style.sources) : [];
      sources
        .filter((sourceId) => sourceId.startsWith("raster-"))
        .forEach((sourceId) => {
          const rasterId = sourceId.replace(/^raster-/, "") as RasterId;
          if (!availableIds.has(rasterId)) {
            removeRaster(rasterId);
          }
        });

      if (rasters.length === 0) {
        return;
      }

      rasters.forEach(async (raster) => {
        const sourceId = `raster-${raster.id}`;
        const layerId = `${sourceId}-layer`;
        const isVisible = rasterVisibility[raster.id];
        const cacheKey = `${raster.id}:${activeOrgId}`;

        if (isVisible) {
          try {
            if (!map.getSource(sourceId)) {
              if (!raster.tilejsonUrl) {
                throw new Error("Raster unavailable.");
              }
              const tilejson = await getTilejson(raster.id, activeOrgId, raster.tilejsonUrl);

              if (!tilejson.tiles?.length) {
                throw new Error("Raster unavailable.");
              }

              map.addSource(sourceId, {
                type: "raster",
                tiles: tilejson.tiles,
                tileSize: tilejson.tileSize ?? 256,
                minzoom: tilejson.minzoom,
                maxzoom: tilejson.maxzoom
              });

              const beforeLayerId = registry.layerList
                .map((layer) => `${layer.id}-fill`)
                .find((candidate) => map.getLayer(candidate));

              map.addLayer(
                {
                  id: layerId,
                  type: "raster",
                  source: sourceId,
                  minzoom: tilejson.minzoom,
                  maxzoom: tilejson.maxzoom,
                  paint: {
                    "raster-opacity": raster.opacity,
                    "raster-resampling": raster.resampling
                  }
                },
                beforeLayerId
              );
            } else if (!map.getLayer(layerId)) {
              map.addLayer({
                id: layerId,
                type: "raster",
                source: sourceId,
                paint: {
                  "raster-opacity": raster.opacity,
                  "raster-resampling": raster.resampling
                }
              });
            } else {
              map.setLayoutProperty(layerId, "visibility", "visible");
            }
          } catch (error) {
            removeRaster(raster.id);
            tilejsonCache.delete(cacheKey);
            pushToastRef.current?.({
              type: "error",
              message: "Raster unavailable."
            });
          }
        } else {
          removeRaster(raster.id);
          tilejsonCache.delete(cacheKey);
        }
      });
    };

    if (!map.isStyleLoaded()) {
      map.once("load", applyVisibility);
      return () => {
        map.off("load", applyVisibility);
      };
    }

    applyVisibility();
  }, [activeOrgId, mapRef, pushToastRef, rasterVisibility, rasters]);
};
