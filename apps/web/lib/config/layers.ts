import type {
  FillLayerSpecification,
  LineLayerSpecification
} from "maplibre-gl";
import { env } from "./env";

export const layerIds = [
  "farms",
  "fields",
  "buildings",
  "greenhouses",
  "greenhouse_areas"
] as const;

export type LayerId = (typeof layerIds)[number];

export type GeometryType = "MultiPolygon" | "Polygon";

export interface LayerDefinition {
  id: LayerId;
  title: string;
  geomType: GeometryType;
  tilesUrlTemplate: string;
  featureCollectionPath: string;
  rpcUpsert: string;
  rpcDelete: string;
  minzoom: number;
  maxzoom: number;
  sourceLayer: string;
  paint: FillLayerSpecification["paint"] &
    LineLayerSpecification["paint"];
  layout?: FillLayerSpecification["layout"];
}

const { FEATURESERV_BASE, TILESERV_BASE } = env;

export const vectorLayers: Record<LayerId, LayerDefinition> = {
  farms: {
    id: "farms",
    title: "Farms",
    geomType: "MultiPolygon",
    tilesUrlTemplate: `${TILESERV_BASE}/public.v_tiles_farms/{z}/{x}/{y}.pbf`,
    featureCollectionPath: `${FEATURESERV_BASE}/collections/farms/items`,
    rpcUpsert: "farms_upsert",
    rpcDelete: "farms_delete",
    minzoom: 4,
    maxzoom: 16,
    sourceLayer: "public.v_tiles_farms",
    paint: {
      "fill-color": "#22c55e",
      "fill-opacity": 0.3,
      "line-color": "#15803d",
      "line-width": 1.5
    }
  },
  fields: {
    id: "fields",
    title: "Fields",
    geomType: "MultiPolygon",
    tilesUrlTemplate: `${TILESERV_BASE}/public.v_tiles_fields/{z}/{x}/{y}.pbf`,
    featureCollectionPath: `${FEATURESERV_BASE}/collections/fields/items`,
    rpcUpsert: "fields_upsert",
    rpcDelete: "fields_delete",
    minzoom: 8,
    maxzoom: 22,
    sourceLayer: "public.v_tiles_fields",
    paint: {
      "fill-color": "#0ea5e9",
      "fill-opacity": 0.25,
      "line-color": "#0369a1",
      "line-width": 1.5
    }
  },
  buildings: {
    id: "buildings",
    title: "Buildings",
    geomType: "MultiPolygon",
    tilesUrlTemplate: `${TILESERV_BASE}/public.v_tiles_buildings/{z}/{x}/{y}.pbf`,
    featureCollectionPath: `${FEATURESERV_BASE}/collections/buildings/items`,
    rpcUpsert: "buildings_upsert",
    rpcDelete: "buildings_delete",
    minzoom: 12,
    maxzoom: 22,
    sourceLayer: "public.v_tiles_buildings",
    paint: {
      "fill-color": "#f97316",
      "fill-opacity": 0.3,
      "line-color": "#c2410c",
      "line-width": 1.5
    }
  },
  greenhouses: {
    id: "greenhouses",
    title: "Greenhouses",
    geomType: "MultiPolygon",
    tilesUrlTemplate: `${TILESERV_BASE}/public.v_tiles_greenhouses/{z}/{x}/{y}.pbf`,
    featureCollectionPath: `${FEATURESERV_BASE}/collections/greenhouses/items`,
    rpcUpsert: "greenhouses_upsert",
    rpcDelete: "greenhouses_delete",
    minzoom: 12,
    maxzoom: 22,
    sourceLayer: "public.v_tiles_greenhouses",
    paint: {
      "fill-color": "#a855f7",
      "fill-opacity": 0.35,
      "line-color": "#7c3aed",
      "line-width": 1.5
    }
  },
  greenhouse_areas: {
    id: "greenhouse_areas",
    title: "Greenhouse Areas",
    geomType: "MultiPolygon",
    tilesUrlTemplate: `${TILESERV_BASE}/public.v_tiles_greenhouse_areas/{z}/{x}/{y}.pbf`,
    featureCollectionPath: `${FEATURESERV_BASE}/collections/greenhouse_areas/items`,
    rpcUpsert: "greenhouse_areas_upsert",
    rpcDelete: "greenhouse_areas_delete",
    minzoom: 14,
    maxzoom: 22,
    sourceLayer: "public.v_tiles_greenhouse_areas",
    paint: {
      "fill-color": "#facc15",
      "fill-opacity": 0.25,
      "line-color": "#d97706",
      "line-width": 1.2
    }
  }
};

export const editableLayerIds = layerIds;

export const isLayerId = (value: string): value is LayerId =>
  layerIds.includes(value as LayerId);
