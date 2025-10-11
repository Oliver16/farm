"use client";

import { useEffect } from "react";
import { registry, type LayerDefinition, isRasterId } from "../lib/config";
import { useAppStore } from "../lib/store";

const formatAcquiredAt = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
};

export const LayerPanel = () => {
  const layerList: LayerDefinition[] = registry.layerList;
  const layerVisibility = useAppStore((state) => state.layerVisibility);
  const toggleLayerVisibility = useAppStore((state) => state.toggleLayerVisibility);
  const activeLayerId = useAppStore((state) => state.activeLayerId);
  const setActiveLayerId = useAppStore((state) => state.setActiveLayerId);
  const activeOrgId = useAppStore((state) => state.activeOrgId);
  const availableRasters = useAppStore((state) => state.availableRasters);
  const setAvailableRasters = useAppStore((state) => state.setAvailableRasters);
  const rasterVisibility = useAppStore((state) => state.rasterVisibility);
  const toggleRasterVisibility = useAppStore((state) => state.toggleRasterVisibility);
  const setAllRastersVisibility = useAppStore((state) => state.setAllRastersVisibility);
  const pushToast = useAppStore((state) => state.pushToast);

  useEffect(() => {
    let cancelled = false;

    const loadRasters = async () => {
      if (!activeOrgId) {
        setAvailableRasters([]);
        return;
      }

      try {
        const response = await fetch(`/api/rasters?org_id=${activeOrgId}`, {
          cache: "no-store"
        });
        if (!response.ok) {
          throw new Error("Failed to load rasters.");
        }
        const payload = (await response.json()) as {
          rasters?: { id: string; acquiredAt?: string | null }[];
        };
        if (cancelled) return;

        const summaries = (payload.rasters ?? []).flatMap((raster) =>
          isRasterId(raster.id)
            ? [{ id: raster.id, acquiredAt: raster.acquiredAt ?? null }]
            : []
        );
        setAvailableRasters(summaries);
      } catch (error) {
        if (cancelled) return;
        setAvailableRasters([]);
        pushToast({
          type: "error",
          message: (error as Error).message ?? "Failed to load rasters."
        });
      }
    };

    void loadRasters();

    return () => {
      cancelled = true;
    };
  }, [activeOrgId, pushToast, setAvailableRasters]);

  const hasRasters = availableRasters.length > 0;

  return (
    <section aria-labelledby="layer-panel-heading">
      <h2 id="layer-panel-heading" style={{ marginTop: 0 }}>
        Layers
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {layerList.map((layer: LayerDefinition) => (
          <div
            key={layer.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5rem"
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={layerVisibility[layer.id]}
                onChange={() => toggleLayerVisibility(layer.id)}
              />
              <span>{layer.title}</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <input
                type="radio"
                checked={activeLayerId === layer.id}
                onChange={() => setActiveLayerId(layer.id)}
                name="active-layer"
              />
              <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>Edit</span>
            </label>
          </div>
        ))}
      </div>
      <h3 style={{ marginBottom: "0.5rem", marginTop: "1.5rem" }}>Rasters</h3>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <button type="button" onClick={() => setAllRastersVisibility(true)}>
          Show all
        </button>
        <button type="button" onClick={() => setAllRastersVisibility(false)}>
          Hide all
        </button>
      </div>
      {hasRasters ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {availableRasters.map((raster) => {
            const acquiredAt = formatAcquiredAt(raster.acquiredAt);
            const label = acquiredAt ? `${raster.title} (${acquiredAt})` : raster.title;
            return (
              <label
                key={raster.id}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(rasterVisibility[raster.id])}
                  onChange={() => toggleRasterVisibility(raster.id)}
                />
                <span>{label}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <p style={{ fontSize: "0.875rem", opacity: 0.75 }}>
          No rasters available for this organization.
        </p>
      )}
    </section>
  );
};
