export { env, type AppEnv } from "./env";
export {
  layerIds,
  editableLayerIds,
  vectorLayers,
  type GeometryType,
  type LayerDefinition,
  type LayerId,
  isLayerId
} from "./layers";
export {
  rasters,
  type RasterDefinition,
  type RasterId,
  isRasterId
} from "./rasters";

export const registry = {
  env,
  vectorLayers,
  rasters,
  layerList: Object.values(vectorLayers),
  rasterList: Object.values(rasters)
};

export type LayerRegistry = typeof registry;
