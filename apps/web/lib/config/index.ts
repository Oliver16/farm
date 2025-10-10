import { env } from "./env";
import {
  layerIds,
  editableLayerIds,
  vectorLayers,
  type GeometryType,
  type LayerDefinition,
  type LayerId,
  isLayerId
} from "./layers";
import {
  rasters,
  type RasterDefinition,
  type RasterId,
  isRasterId
} from "./rasters";

export const layerList = Object.values(vectorLayers);
export const rasterList = Object.values(rasters);

export { env };
export type { AppEnv } from "./env";
export {
  layerIds,
  editableLayerIds,
  vectorLayers,
  type GeometryType,
  type LayerDefinition,
  type LayerId,
  isLayerId
};
export { rasters, type RasterDefinition, type RasterId, isRasterId };

export const registry = {
  env,
  vectorLayers,
  rasters,
  layerList,
  rasterList
};

export type LayerRegistry = typeof registry;
