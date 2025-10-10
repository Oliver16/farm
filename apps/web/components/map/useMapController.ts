import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import MapboxDraw from "maplibre-gl-draw";
import type { Feature, FeatureCollection } from "geojson";
import { registry } from "../../lib/config";
import { useAppStore } from "../../lib/store";
import { validateFeaturePayload } from "../../lib/validation";
import { jsonFetcher } from "../../lib/fetcher";
import { useLatest } from "../../lib/hooks/useLatest";
import { useFeatureFetcher } from "./useFeatureFetcher";
import { useDrawSync } from "./useDrawSync";
import { useLayerVisibility } from "./useLayerVisibility";
import { useRasterVisibility } from "./useRasterVisibility";
import { errorMessages } from "./constants";

const identifyLayerFromId = (layerId: string) =>
  registry.layerList.find((layer) => layerId.startsWith(layer.id))?.id ?? null;

const debounce = (fn: () => void, delay: number) => {
  let timeoutId: number | undefined;
  return () => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(fn, delay);
  };
};

export const useMapController = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const attributesRef = useRef<Record<string, unknown>>({});

  const activeLayerId = useAppStore((state) => state.activeLayerId);
  const activeOrgId = useAppStore((state) => state.activeOrgId);
  const layerVisibility = useAppStore((state) => state.layerVisibility);
  const rasterVisibility = useAppStore((state) => state.rasterVisibility);
  const setSelectedFeature = useAppStore((state) => state.setSelectedFeature);
  const pushToast = useAppStore((state) => state.pushToast);
  const setDrawDirty = useAppStore((state) => state.setDrawDirty);

  const { featureCollection, mutate, updateBounds } = useFeatureFetcher(
    activeLayerId,
    activeOrgId
  );

  const activeLayerIdRef = useLatest(activeLayerId);
  const activeOrgIdRef = useLatest(activeOrgId);
  const pushToastRef = useLatest(pushToast);
  const mutateRef = useLatest(mutate);

  useEffect(() => {
    setSelectedFeature(undefined);
    attributesRef.current = {};
  }, [activeLayerId, setSelectedFeature]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style:
        process.env.NEXT_PUBLIC_BASEMAP_STYLE_URL ??
        registry.env.NEXT_PUBLIC_BASEMAP_STYLE_URL,
      center: [-96, 37.5],
      zoom: 4
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }));
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      modes: MapboxDraw.modes
    });

    map.addControl(draw, "top-left");

    mapRef.current = map;
    drawRef.current = draw;

    const markDirty = () => setDrawDirty(true);

    map.on("load", () => {
      registry.layerList.forEach((layer) => {
        if (!map.getSource(layer.id)) {
          map.addSource(layer.id, {
            type: "vector",
            tiles: [layer.tilesUrlTemplate],
            minzoom: layer.minzoom,
            maxzoom: layer.maxzoom
          });
        }

        if (!map.getLayer(`${layer.id}-fill`)) {
          map.addLayer({
            id: `${layer.id}-fill`,
            type: "fill",
            source: layer.id,
            "source-layer": layer.sourceLayer,
            paint: {
              "fill-color": layer.paint["fill-color"],
              "fill-opacity": layer.paint["fill-opacity"] ?? 0.25
            },
            layout: {
              visibility: layerVisibility[layer.id] ? "visible" : "none"
            }
          });
        }

        if (!map.getLayer(`${layer.id}-line`)) {
          map.addLayer({
            id: `${layer.id}-line`,
            type: "line",
            source: layer.id,
            "source-layer": layer.sourceLayer,
            paint: {
              "line-color": layer.paint["line-color"],
              "line-width": layer.paint["line-width"] ?? 1.5
            },
            layout: {
              visibility: layerVisibility[layer.id] ? "visible" : "none"
            }
          });
        }
      });

      updateBounds(map.getBounds());
    });

    const debouncedMove = debounce(() => {
      updateBounds(map.getBounds());
    }, 300);

    map.on("moveend", debouncedMove);
    map.on("draw.create", markDirty);
    map.on("draw.update", markDirty);
    map.on("draw.delete", markDirty);

    map.on("draw.selectionchange", () => {
      const selection = draw.getSelected();
      if (selection.features.length > 0) {
        setSelectedFeature(selection.features[0] as Feature);
      }
    });

    map.on("click", async (event) => {
      const orgId = activeOrgIdRef.current;
      if (!orgId) return;
      const layers = registry.layerList.flatMap((layer) => [
        `${layer.id}-fill`,
        `${layer.id}-line`
      ]);
      const features = map.queryRenderedFeatures(event.point, { layers });
      if (!features.length) return;
      const tileFeature = features[0];
      const layerId = identifyLayerFromId(tileFeature.layer.id ?? "");
      const featureId = (
        tileFeature.properties as Record<string, string> | undefined
      )?.id;
      if (!layerId || !featureId) return;
      try {
        const detail = await jsonFetcher<FeatureCollection>(
          `/api/features/${layerId}?org_id=${orgId}&filter=${encodeURIComponent(
            JSON.stringify({ id: featureId })
          )}&limit=1`
        );
        if (detail.features.length > 0) {
          setSelectedFeature(detail.features[0]);
          attributesRef.current = detail.features[0].properties ?? {};
        }
      } catch (error) {
        pushToastRef.current?.({
          type: "error",
          message: (error as Error).message
        });
      }
    });

    const handleDrawStart = (event: Event) => {
      const detail = (event as CustomEvent).detail as { mode?: string };
      if (!detail?.mode) return;
      draw.changeMode(detail.mode as any);
    };

    const handleDrawDelete = () => {
      draw.trash();
    };

    const handleDrawCancel = () => {
      draw.deleteAll();
      setDrawDirty(false);
      mutateRef.current?.();
    };

    const handleAttributeUpdate = (event: Event) => {
      const detail = (event as CustomEvent).detail as Record<string, unknown>;
      attributesRef.current = detail;
      setDrawDirty(true);
    };

    const handleSave = async () => {
      const layerId = activeLayerIdRef.current;
      const orgId = activeOrgIdRef.current;
      const pushToast = pushToastRef.current;
      const mutateFn = mutateRef.current;
      if (!layerId || !orgId || !pushToast || !mutateFn) {
        pushToast?.({
          type: "error",
          message: "Select an organization and layer."
        });
        return;
      }
      const currentDraw = drawRef.current;
      if (!currentDraw) return;
      const selected =
        currentDraw.getSelected().features[0] ?? currentDraw.getAll().features[0];
      if (!selected) {
        pushToast({
          type: "info",
          message: "Draw or select a feature to save."
        });
        return;
      }

      const layer = registry.vectorLayers[layerId];
      const properties = {
        ...(selected.properties ?? {}),
        ...attributesRef.current,
        org_id: orgId
      };

      try {
        const payload = validateFeaturePayload(
          layer,
          selected.geometry,
          properties
        );
        const response = await fetch(`/api/write/${layer.id}`, {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          const code = error?.error?.code ?? "UNKNOWN";
          pushToast({
            type: "error",
            message:
              errorMessages[code] ?? error?.error?.message ?? "Save failed"
          });
          return;
        }

        const saved = (await response.json()) as Feature;
        pushToast({ type: "success", message: "Feature saved" });
        setSelectedFeature(saved);
        attributesRef.current = saved.properties ?? {};
        setDrawDirty(false);
        mutateFn();
      } catch (error) {
        const code = (error as Error).message;
        pushToastRef.current?.({
          type: "error",
          message: errorMessages[code] ?? (error as Error).message
        });
      }
    };

    window.addEventListener("map:draw:start", handleDrawStart);
    window.addEventListener("map:draw:delete", handleDrawDelete);
    window.addEventListener("map:draw:cancel", handleDrawCancel);
    window.addEventListener("map:draw:save", handleSave);
    window.addEventListener("map:attributes:update", handleAttributeUpdate);

    return () => {
      window.removeEventListener("map:draw:start", handleDrawStart);
      window.removeEventListener("map:draw:delete", handleDrawDelete);
      window.removeEventListener("map:draw:cancel", handleDrawCancel);
      window.removeEventListener("map:draw:save", handleSave);
      window.removeEventListener("map:attributes:update", handleAttributeUpdate);
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
  }, [
    activeOrgIdRef,
    mutateRef,
    pushToastRef,
    setDrawDirty,
    setSelectedFeature,
    updateBounds
  ]);

  useDrawSync(drawRef, featureCollection, activeLayerId, setDrawDirty);

  useLayerVisibility(mapRef, layerVisibility);

  useRasterVisibility(mapRef, rasterVisibility, activeOrgId, pushToastRef);

  return { containerRef };
};
