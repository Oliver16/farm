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

import { env } from "./env";
import { vectorLayers, type LayerDefinition } from "./layers";
import { rasters, type RasterDefinition } from "./rasters";

const layerList: LayerDefinition[] = Object.values(vectorLayers);
const rasterList: RasterDefinition[] = Object.values(rasters);

export const registry = {
  env,
  vectorLayers,
  rasters,
  layerList,
  rasterList
};

export type LayerRegistry = typeof registry;
