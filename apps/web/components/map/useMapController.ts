import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import MapboxDraw, { type DrawCustomMode, type DrawMode } from "@mapbox/mapbox-gl-draw";
import type { Feature, FeatureCollection } from "geojson";
import { registry, type LayerId } from "../../lib/config";
import { useAppStore } from "../../lib/store";
import { validateFeaturePayload } from "../../lib/validation";
import { jsonFetcher } from "../../lib/fetcher";
import { useLatest } from "../../lib/hooks/useLatest";
import { useFeatureFetcher } from "./useFeatureFetcher";
import { useDrawSync } from "./useDrawSync";
import { useLayerVisibility } from "./useLayerVisibility";
import { useRasterVisibility } from "./useRasterVisibility";
import { errorMessages } from "./constants";
import { getFeatureCollectionBounds } from "../../lib/utils/geojson";
import { drawStyles } from "./drawStyles";

const identifyLayerFromId = (layerId: string): LayerId | null =>
  registry.layerList.find((layer) => layerId.startsWith(layer.id))?.id ?? null;

const DEFAULT_CENTER: [number, number] = [-96, 37.5];
const DEFAULT_ZOOM = 4;
const DEFAULT_ORG_LAYER: LayerId = "farms";

const debounce = (fn: () => void, delay: number) => {
  let timeoutId: number | undefined;
  return () => {
    if (timeoutId) window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(fn, delay);
  };
};

const withQuery = (template: string, query: string) =>
  template.includes("?") ? `${template}&${query}` : `${template}?${query}`;

const tilesForOrg = (template: string, orgId?: string | null) =>
  [
    orgId
      ? withQuery(template, `where=${encodeURIComponent(`org_id='${orgId}'`)}`)
      : template
  ];

const rebuildVectorSources = (
  map: maplibregl.Map,
  orgId: string | null,
  visibility: Record<LayerId, boolean>
) => {
  registry.layerList.forEach((layer) => {
    if (map.getLayer(`${layer.id}-fill`)) map.removeLayer(`${layer.id}-fill`);
    if (map.getLayer(`${layer.id}-line`)) map.removeLayer(`${layer.id}-line`);
    if (map.getSource(layer.id)) map.removeSource(layer.id);

    map.addSource(layer.id, {
      type: "vector",
      tiles: tilesForOrg(layer.tilesUrlTemplate, orgId),
      minzoom: layer.minzoom,
      maxzoom: layer.maxzoom
    });

    map.addLayer({
      id: `${layer.id}-fill`,
      type: "fill",
      source: layer.id,
      "source-layer": layer.sourceLayer,
      paint: {
        "fill-color": layer.paint?.["fill-color"],
        "fill-opacity": layer.paint?.["fill-opacity"] ?? 0.25
      },
      layout: { visibility: visibility?.[layer.id] ? "visible" : "none" }
    });

    map.addLayer({
      id: `${layer.id}-line`,
      type: "line",
      source: layer.id,
      "source-layer": layer.sourceLayer,
      paint: {
        "line-color": layer.paint?.["line-color"],
        "line-width": layer.paint?.["line-width"] ?? 1.5
      },
      layout: { visibility: visibility?.[layer.id] ? "visible" : "none" }
    });
  });
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
  const availableRasters = useAppStore((state) => state.availableRasters);
  const setSelectedFeature = useAppStore((state) => state.setSelectedFeature);
  const pushToast = useAppStore((state) => state.pushToast);
  const setDrawDirty = useAppStore((state) => state.setDrawDirty);

  const { featureCollection, mutate, updateBounds } = useFeatureFetcher(
    activeLayerId,
    activeOrgId ?? null
  );

  const activeLayerIdRef = useLatest(activeLayerId);
  const activeOrgIdRef = useLatest(activeOrgId);
  const pushToastRef = useLatest(pushToast);
  const mutateRef = useLatest(mutate);
  const layerVisibilityRef = useLatest(layerVisibility);

  useEffect(() => {
    setSelectedFeature(undefined);
    attributesRef.current = {};
  }, [activeLayerId, setSelectedFeature]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style:
        process.env.NEXT_PUBLIC_BASEMAP_STYLE_URL ??
        registry.env.NEXT_PUBLIC_BASEMAP_STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM
    });

    const drawLayerIds = new Set(drawStyles.map((style) => style.id));
    const drawSourceIds = new Set(["mapbox-gl-draw-hot", "mapbox-gl-draw-cold"]);

    const originalAddLayer = map.addLayer.bind(map);
    const originalAddSource = map.addSource.bind(map);
    const unpatchedAddLayer = map.addLayer;
    const unpatchedAddSource = map.addSource;

    const skipDuplicateDrawLayer = (
      ...args: Parameters<maplibregl.Map["addLayer"]>
    ): ReturnType<maplibregl.Map["addLayer"]> => {
      const [layer] = args;
      if (
        layer &&
        "id" in layer &&
        typeof layer.id === "string" &&
        drawLayerIds.has(layer.id) &&
        map.getLayer(layer.id)
      ) {
        return map;
      }
      return originalAddLayer(...args);
    };

    const skipDuplicateDrawSource = (
      ...args: Parameters<maplibregl.Map["addSource"]>
    ): ReturnType<maplibregl.Map["addSource"]> => {
      const [id] = args;
      if (typeof id === "string" && drawSourceIds.has(id) && map.getSource(id)) {
        return map;
      }
      return originalAddSource(...args);
    };

    map.addLayer = skipDuplicateDrawLayer;
    map.addSource = skipDuplicateDrawSource;

    map.addControl(new maplibregl.AttributionControl({ compact: true }));
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    type DrawModeImplementation = DrawCustomMode<Record<string, unknown>, Record<string, unknown>>;
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      modes: MapboxDraw.modes as unknown as Record<string, DrawModeImplementation>,
      styles: drawStyles
    });
    const changeMode = draw.changeMode.bind(draw) as (mode: DrawMode) => MapboxDraw;

    map.addControl(draw as unknown as maplibregl.IControl, "top-left");

    mapRef.current = map;
    drawRef.current = draw;

    const markDirty = () => setDrawDirty(true);

    const handleLoad = () => {
      rebuildVectorSources(map, activeOrgIdRef.current ?? null, layerVisibilityRef.current);
      updateBounds(map.getBounds(), map.getZoom());
    };

    map.on("load", handleLoad);

    const debouncedMove = debounce(() => {
      updateBounds(map.getBounds(), map.getZoom());
    }, 300);

    map.on("moveend", debouncedMove);
    map.on("draw.create", markDirty);
    map.on("draw.update", markDirty);
    map.on("draw.delete", markDirty);

    const handleSelectionChange = () => {
      const selection = draw.getSelected();
      if (selection.features.length > 0) {
        setSelectedFeature(selection.features[0] as Feature);
      }
    };

    map.on("draw.selectionchange", handleSelectionChange);

    const handleMapClick = async (event: maplibregl.MapLayerMouseEvent) => {
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
      const featureId = (tileFeature.properties as Record<string, string> | undefined)?.id;
      if (!layerId || !featureId) return;
      const layerConfig = registry.vectorLayers[layerId];
      try {
        const detail = await jsonFetcher<FeatureCollection>(
          `/api/features/${layerConfig.collectionId}?org_id=${orgId}&filter=${encodeURIComponent(
            JSON.stringify({ id: featureId })
          )}&limit=1`
        );
        if (detail.features.length > 0) {
          setSelectedFeature(detail.features[0]);
          attributesRef.current = detail.features[0].properties ?? {};
        }
      } catch (error) {
        pushToastRef.current?.({ type: "error", message: (error as Error).message });
      }
    };

    map.on("click", handleMapClick);

    const handleDrawStart = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: DrawMode }>).detail;
      if (!detail?.mode) return;
      changeMode(detail.mode);
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
        pushToast?.({ type: "error", message: "Select an organization and layer." });
        return;
      }
      const currentDraw = drawRef.current;
      if (!currentDraw) return;
      const selected =
        currentDraw.getSelected().features[0] ?? currentDraw.getAll().features[0];
      if (!selected) {
        pushToast({ type: "info", message: "Draw or select a feature to save." });
        return;
      }

      const layer = registry.vectorLayers[layerId];
      const properties = {
        ...(selected.properties ?? {}),
        ...attributesRef.current,
        org_id: orgId
      };

      try {
        const payload = validateFeaturePayload(layer, selected.geometry, properties);
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
            message: errorMessages[code] ?? error?.error?.message ?? "Save failed"
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
      map.off("load", handleLoad);
      map.off("moveend", debouncedMove);
      map.off("draw.create", markDirty);
      map.off("draw.update", markDirty);
      map.off("draw.delete", markDirty);
      map.off("draw.selectionchange", handleSelectionChange);
      map.off("click", handleMapClick);
      map.addLayer = unpatchedAddLayer;
      map.addSource = unpatchedAddSource;
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
  }, [
    activeLayerIdRef,
    activeOrgIdRef,
    layerVisibilityRef,
    mutateRef,
    pushToastRef,
    setDrawDirty,
    setSelectedFeature,
    updateBounds
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => rebuildVectorSources(map, activeOrgId ?? null, layerVisibility);
    if (!map.isStyleLoaded()) {
      map.once("load", apply);
      return () => {
        map.off("load", apply);
      };
    }
    apply();
  }, [activeOrgId, layerVisibility]);

  useDrawSync(drawRef, featureCollection, activeLayerId, setDrawDirty);
  useLayerVisibility(mapRef, layerVisibility);
  useRasterVisibility(
    mapRef,
    availableRasters,
    rasterVisibility,
    activeOrgId ?? null,
    pushToastRef
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let cancelled = false;

    const flyToDefault = () => {
      if (cancelled) return;
      map.easeTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
    };

    const updateView = async () => {
      if (!activeOrgId) {
        flyToDefault();
        return;
      }
      try {
        const defaultLayer = registry.vectorLayers[DEFAULT_ORG_LAYER];
        const farms = await jsonFetcher<FeatureCollection>(
          `/api/features/${defaultLayer.collectionId}?org_id=${activeOrgId}&limit=200`
        );

        if (cancelled) return;

        const bounds = getFeatureCollectionBounds(farms);
        if (!bounds) {
          flyToDefault();
          return;
        }
        const [[minLng, minLat], [maxLng, maxLat]] = bounds;
        if (minLng === maxLng && minLat === maxLat) {
          map.easeTo({ center: [minLng, minLat], zoom: 16 });
          return;
        }
        map.fitBounds(bounds, { padding: 64, maxZoom: 16, duration: 800 });
      } catch {
        if (!cancelled) flyToDefault();
      }
    };

    if (!map.isStyleLoaded()) {
      const handleLoad = () => {
        void updateView();
      };
      map.once("load", handleLoad);
      return () => {
        cancelled = true;
        map.off("load", handleLoad);
      };
    }

    void updateView();
    return () => {
      cancelled = true;
    };
  }, [activeOrgId]);

  return { containerRef };
};
