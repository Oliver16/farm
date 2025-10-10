"use client";

import { registry } from "../lib/config";
import { useAppStore } from "../lib/store";

export const LayerPanel = () => {
  const { layerList, rasterList } = registry;
  const layerVisibility = useAppStore((state) => state.layerVisibility);
  const toggleLayerVisibility = useAppStore((state) => state.toggleLayerVisibility);
  const activeLayerId = useAppStore((state) => state.activeLayerId);
  const setActiveLayerId = useAppStore((state) => state.setActiveLayerId);
  const rasterVisibility = useAppStore((state) => state.rasterVisibility);
  const toggleRasterVisibility = useAppStore((state) => state.toggleRasterVisibility);

  return (
    <section aria-labelledby="layer-panel-heading">
      <h2 id="layer-panel-heading" style={{ marginTop: 0 }}>
        Layers
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {layerList.map((layer) => (
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
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {rasterList.map((raster) => (
          <label
            key={raster.id}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <input
              type="checkbox"
              checked={rasterVisibility[raster.id]}
              onChange={() => toggleRasterVisibility(raster.id)}
            />
            <span>{raster.title}</span>
          </label>
        ))}
      </div>
    </section>
  );
};
