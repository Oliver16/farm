// MapLibre-safe styles for @mapbox/mapbox-gl-draw
// NO data expressions for line-dasharray, only constants.

import type { LayerSpecification } from "maplibre-gl";

const blue = "#3b82f6";
const cyan = "#22d3ee";
const red = "#ef4444";
const gray = "#9ca3af";
const fillSel = "rgba(59,130,246,0.12)";
const fillCold = "rgba(148,163,184,0.08)";

export const drawStyles: LayerSpecification[] = [
  // Polygon fill (inactive)
  {
    id: "gl-draw-polygon-fill.cold",
    type: "fill",
    filter: ["all", ["==", "active", "false"], ["==", "$type", "Polygon"]],
    paint: { "fill-color": fillCold, "fill-outline-color": gray }
  },
  // Polygon fill (active)
  {
    id: "gl-draw-polygon-fill.hot",
    type: "fill",
    filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
    paint: { "fill-color": fillSel, "fill-outline-color": cyan }
  },
  // Polygon outline
  {
    id: "gl-draw-polygon-stroke.cold",
    type: "line",
    filter: ["all", ["==", "active", "false"], ["==", "$type", "Polygon"]],
    paint: { "line-color": gray, "line-width": 2 }
  },
  {
    id: "gl-draw-polygon-stroke.hot",
    type: "line",
    filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
    paint: { "line-color": blue, "line-width": 2 }
  },
  // Lines
  {
    id: "gl-draw-line.cold",
    type: "line",
    filter: ["all", ["==", "active", "false"], ["==", "$type", "LineString"]],
    paint: {
      "line-color": gray,
      "line-width": 2,
      // IMPORTANT: constant dash array (no expressions)
      "line-dasharray": [0.5, 2]
    }
  },
  {
    id: "gl-draw-line.hot",
    type: "line",
    filter: ["all", ["==", "active", "true"], ["==", "$type", "LineString"]],
    paint: {
      "line-color": blue,
      "line-width": 2,
      "line-dasharray": [0.25, 1.5]
    }
  },
  // Points (vertex)
  {
    id: "gl-draw-points.cold",
    type: "circle",
    filter: ["all", ["==", "meta", "vertex"], ["==", "active", "false"]],
    paint: { "circle-radius": 4, "circle-color": gray, "circle-stroke-width": 1, "circle-stroke-color": "#fff" }
  },
  {
    id: "gl-draw-points.hot",
    type: "circle",
    filter: ["all", ["==", "meta", "vertex"], ["==", "active", "true"]],
    paint: { "circle-radius": 5, "circle-color": blue, "circle-stroke-width": 1, "circle-stroke-color": "#fff" }
  },
  // Midpoints
  {
    id: "gl-draw-midpoint",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
    paint: { "circle-radius": 4, "circle-color": cyan, "circle-stroke-width": 1, "circle-stroke-color": "#fff" }
  },
  // Inactive features (thin outline)
  {
    id: "gl-draw-inactive-outline",
    type: "line",
    filter: ["all", ["==", "active", "false"], ["!=", "meta", "vertex"], ["!=", "meta", "midpoint"]],
    paint: { "line-color": "#000", "line-opacity": 0.1, "line-width": 1 }
  },
  // Static (read-only)
  {
    id: "gl-draw-static",
    type: "line",
    filter: ["all", ["==", "mode", "static"]],
    paint: { "line-color": red, "line-width": 2 }
  }
];
