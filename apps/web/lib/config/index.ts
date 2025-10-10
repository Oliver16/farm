import { env } from "./env";
import {
  layerIds,
  editableLayerIds,
  vectorLayers,
  layerList,
  type GeometryType,
  type LayerDefinition,
  type LayerId,
  isLayerId
} from "./layers";
import {
  rasters,
  rasterList,
  type RasterDefinition,
  type RasterId,
  isRasterId
} from "./rasters";

export { env };
export type { AppEnv } from "./env";
export {
  layerIds,
  editableLayerIds,
  vectorLayers,
  layerList,
  type GeometryType,
  type LayerDefinition,
  type LayerId,
  isLayerId
};
export { rasters, rasterList, type RasterDefinition, type RasterId, isRasterId };
export type { VectorLayerConfig, RasterConfig } from "../types/layers";

export const registry = {
  env,
  vectorLayers,
  rasters,
  layerList,
  rasterList
};

export type LayerRegistry = typeof registry;
