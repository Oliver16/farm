"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import MapboxDraw, { type DrawCustomMode } from "@mapbox/mapbox-gl-draw";
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
      controls: {
        polygon: true,
        trash: true
      }
    });

    drawRef.current = draw;

    map.addControl(draw as unknown as maplibregl.IControl, "top-left");

    const syncFeature = () => {
      if (!drawRef.current) return;
      const collection = drawRef.current.getAll();
      const feature = asSingleFeature(collection);
      onFeatureChange(feature);
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
    });

    mapRef.current = map;
    drawRef.current = draw;

    return () => {
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
  }, [onFeatureChange]);

  return (
    <div
      ref={mapContainerRef}
      style={{ width: "100%", height: "320px", borderRadius: "0.75rem", overflow: "hidden" }}
    />
  );
};
