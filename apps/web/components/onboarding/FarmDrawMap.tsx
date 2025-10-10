"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import MapboxDraw, { type DrawCustomMode } from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { registry } from "@/lib/config";

export interface FarmDrawMapProps {
  onFeatureChange: (feature: Feature<Polygon | MultiPolygon> | null) => void;
}

const asSingleFeature = (
  collection: FeatureCollection
): Feature<Polygon | MultiPolygon> | null => {
  const feature = collection.features[0];
  if (!feature) {
    return null;
  }

  if (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon") {
    return feature as Feature<Polygon | MultiPolygon>;
  }

  return null;
};

export const FarmDrawMap = ({ onFeatureChange }: FarmDrawMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const hasFeatureRef = useRef(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasFeature, setHasFeature] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: registry.env.NEXT_PUBLIC_BASEMAP_STYLE_URL,
      center: [-96, 37.5],
      zoom: 3
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    type DrawModeImplementation = DrawCustomMode<
      Record<string, unknown>,
      Record<string, unknown>
    >;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      modes: MapboxDraw.modes as unknown as Record<string, DrawModeImplementation>,
      controls: {},
      defaultMode: "simple_select"
    });

    drawRef.current = draw;

    map.addControl(draw as unknown as maplibregl.IControl, "top-left");

    const syncFeature = () => {
      if (!drawRef.current) return;
      const collection = drawRef.current.getAll();
      const feature = asSingleFeature(collection);
      onFeatureChange(feature);
      const nextHasFeature = Boolean(feature);
      setHasFeature(nextHasFeature);

      if (!feature) {
        hasFeatureRef.current = false;
        return;
      }

      if (mapRef.current && !hasFeatureRef.current) {
        const bounds = new maplibregl.LngLatBounds();

        const extendCoordinates = (coords: unknown): void => {
          if (!Array.isArray(coords)) return;

          if (typeof coords[0] === "number" && typeof coords[1] === "number") {
            const [lng, lat] = coords as [number, number];
            if (Number.isFinite(lng) && Number.isFinite(lat)) {
              bounds.extend([lng, lat]);
            }
            return;
          }

          coords.forEach((nested) => {
            extendCoordinates(nested);
          });
        };

        extendCoordinates(feature.geometry.coordinates);

        if (!bounds.isEmpty()) {
          mapRef.current.fitBounds(bounds, {
            padding: 48,
            maxZoom: 15,
            duration: 600
          });
        }
      }

      hasFeatureRef.current = true;
    };

    const enforceSingleFeature = () => {
      if (!drawRef.current) return;
      const collection = drawRef.current.getAll();
      if (collection.features.length <= 1) {
        syncFeature();
        return;
      }

      const [first, ...rest] = collection.features;
      rest.forEach((feature) => {
        if (feature.id) {
          drawRef.current?.delete(feature.id as string);
        }
      });

      if (first?.id) {
        const featureId = String(first.id);
        drawRef.current?.changeMode("simple_select", { featureIds: [featureId] });
      }

      syncFeature();
    };

    map.on("draw.create", enforceSingleFeature);
    map.on("draw.update", syncFeature);
    map.on("draw.delete", () => {
      onFeatureChange(null);
      hasFeatureRef.current = false;
      setHasFeature(false);
    });

    map.on("draw.modechange", (event: { mode?: string }) => {
      const mode = event.mode ?? "simple_select";
      const drawing = mode === "draw_polygon";
      setIsDrawing(drawing);
      if (drawing) {
        map.doubleClickZoom.disable();
      } else {
        map.doubleClickZoom.enable();
      }
    });

    if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
      const observer = new ResizeObserver(() => {
        map.resize();
      });

      observer.observe(mapContainerRef.current);

      map.on("remove", () => {
        observer.disconnect();
      });
    }

    mapRef.current = map;
    drawRef.current = draw;

    return () => {
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
  }, [onFeatureChange]);

  const handleStartDrawing = () => {
    if (!drawRef.current) return;
    drawRef.current.changeMode("draw_polygon");
  };

  const handleFinishDrawing = () => {
    if (!drawRef.current) return;
    drawRef.current.changeMode("simple_select");
  };

  const handleClearDrawing = () => {
    if (!drawRef.current) return;
    drawRef.current.deleteAll();
    hasFeatureRef.current = false;
    setHasFeature(false);
    onFeatureChange(null);
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        borderRadius: "0.75rem",
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(15, 118, 110, 0.18)"
      }}
    >
      <div ref={mapContainerRef} style={{ width: "100%", height: "440px" }} />
      <div
        style={{
          position: "absolute",
          top: "1rem",
          left: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          padding: "0.85rem 1rem",
          borderRadius: "0.9rem",
          background: "rgba(7, 25, 36, 0.88)",
          border: "1px solid rgba(94, 234, 212, 0.2)",
          maxWidth: "280px",
          color: "#f8fafc",
          fontSize: "0.9rem",
          pointerEvents: "auto"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <span style={{ fontWeight: 600 }}>Farm boundary</span>
          <span style={{ opacity: 0.8 }}>
            Click <strong>Start drawing</strong> and trace the outer fence line. Double-click to finish the
            shape, then adjust vertices as needed.
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gap: "0.5rem",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))"
          }}
        >
          <button
            type="button"
            onClick={handleStartDrawing}
            disabled={isDrawing}
            style={{
              padding: "0.5rem 0.4rem",
              borderRadius: "0.6rem",
              border: "1px solid rgba(148, 163, 184, 0.35)",
              background: isDrawing ? "rgba(59,130,246,0.35)" : "rgba(59,130,246,0.65)",
              color: "#f8fafc",
              cursor: isDrawing ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: "0.85rem"
            }}
          >
            Start
          </button>
          <button
            type="button"
            onClick={handleFinishDrawing}
            disabled={!isDrawing}
            style={{
              padding: "0.5rem 0.4rem",
              borderRadius: "0.6rem",
              border: "1px solid rgba(148, 163, 184, 0.35)",
              background: !isDrawing ? "rgba(14,165,233,0.35)" : "rgba(14,165,233,0.65)",
              color: "#f8fafc",
              cursor: !isDrawing ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: "0.85rem"
            }}
          >
            Finish
          </button>
          <button
            type="button"
            onClick={handleClearDrawing}
            disabled={!hasFeature}
            style={{
              padding: "0.5rem 0.4rem",
              borderRadius: "0.6rem",
              border: "1px solid rgba(248,113,113,0.45)",
              background: !hasFeature ? "rgba(248,113,113,0.25)" : "rgba(248,113,113,0.5)",
              color: "#fef2f2",
              cursor: !hasFeature ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: "0.85rem"
            }}
          >
            Clear
          </button>
        </div>
        <span style={{ fontSize: "0.75rem", opacity: 0.65 }}>
          Tip: drag corners to refine the footprint. Use Clear if you need to start over.
        </span>
      </div>
    </div>
  );
};
