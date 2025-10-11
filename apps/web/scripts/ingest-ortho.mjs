#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";
import { fromFile } from "geotiff";
import proj4 from "proj4";
import epsgIndex from "epsg-index/all.json" with { type: "json" };

const WGS84 = "WGS84";

const defaultOptions = {
  bucket: "basemaps",
  prefix: "orthos",
  type: "ortho"
};

const usage = `Usage: node scripts/ingest-ortho.mjs --file <path> --org <uuid> [options]\n\nOptions:\n  --bucket <name>         Supabase storage bucket (default: basemaps)\n  --prefix <path>         Folder inside the bucket (default: orthos)\n  --type <ortho|dem>      Raster type stored in the rasters table (default: ortho)\n  --farm <uuid>           Optional farm_id for rasters.farm_id\n  --acquired-at <iso>     Optional acquisition timestamp (ISO 8601)\n  --epsg <code>           Override EPSG code if the GeoTIFF is missing metadata\n  --slug <name>           Override object key basename (default: derived from filename)\n`;

function parseArgs(argv) {
  const options = { ...defaultOptions };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    options[key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = next;
    i += 1;
  }
  if (!options.file || !options.org) {
    console.error(usage);
    throw new Error("Both --file and --org are required");
  }
  if (options.type && !["ortho", "dem"].includes(options.type)) {
    throw new Error("--type must be either 'ortho' or 'dem'");
  }
  return options;
}

function ensureEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set in the environment`);
  }
  return value;
}

function normaliseEpsg(code) {
  if (!code) {
    return null;
  }
  const numeric = Number.parseInt(code, 10);
  if (Number.isNaN(numeric)) {
    throw new Error(`EPSG code must be numeric, received: ${code}`);
  }
  return numeric;
}

function lookupProjDefinition(epsg) {
  const record = epsgIndex[String(epsg)];
  if (!record || !record.proj4) {
    return null;
  }
  return record.proj4;
}

function projectBoundingBox(bbox, sourceEpsg) {
  const epsgId = `EPSG:${sourceEpsg}`;
  if (!proj4.defs(epsgId)) {
    const definition = lookupProjDefinition(sourceEpsg);
    if (!definition) {
      throw new Error(`Unable to find proj4 definition for EPSG:${sourceEpsg}`);
    }
    proj4.defs(epsgId, definition);
  }
  const lowerLeft = proj4(epsgId, WGS84, [bbox[0], bbox[1]]);
  const upperRight = proj4(epsgId, WGS84, [bbox[2], bbox[3]]);
  const minX = Math.min(lowerLeft[0], upperRight[0]);
  const minY = Math.min(lowerLeft[1], upperRight[1]);
  const maxX = Math.max(lowerLeft[0], upperRight[0]);
  const maxY = Math.max(lowerLeft[1], upperRight[1]);
  return [minX, minY, maxX, maxY];
}

function bboxToWkt(bbox) {
  const [minX, minY, maxX, maxY] = bbox;
  const ring = [
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
    [minX, minY]
  ]
    .map(([x, y]) => `${x.toFixed(8)} ${y.toFixed(8)}`)
    .join(", ");
  return `SRID=4326;POLYGON((${ring}))`;
}

function resolveObjectKey(prefix, slug, filePath) {
  const sourceExt = path.extname(filePath) || ".tif";
  let key = slug ?? path.basename(filePath);
  if (!path.extname(key)) {
    key = `${key}${sourceExt}`;
  }
  key = key.replace(/^\/+/, "");
  const cleanPrefix = prefix ? prefix.replace(/^\/+|\/+$/g, "") : "";
  return cleanPrefix ? `${cleanPrefix}/${key}` : key;
}

async function readGeoMetadata(filePath, overrideEpsg) {
  const tiff = await fromFile(filePath);
  const image = await tiff.getImage();
  const bbox = image.getBoundingBox();
  const geoKeys = image.getGeoKeys();
  const epsg = overrideEpsg ?? geoKeys.ProjectedCSTypeGeoKey ?? geoKeys.GeographicTypeGeoKey;
  if (!epsg) {
    throw new Error("Unable to determine EPSG code from GeoTIFF metadata; supply --epsg");
  }
  const projected = projectBoundingBox(bbox, epsg);
  const footprint = bboxToWkt(projected);
  const scale = image.getFileDirectory()?.ModelPixelScale;
  const unit = epsgIndex[String(epsg)]?.unit ?? null;
  const resolutionValue = Array.isArray(scale) && scale.length > 0 ? scale[0] : null;
  const resolution = unit === "metre" && typeof resolutionValue === "number" ? resolutionValue : null;
  return {
    footprint,
    resolution,
    epsg: `EPSG:${epsg}`
  };
}

async function uploadToStorage(client, bucket, objectKey, filePath) {
  const file = await fs.readFile(filePath);
  const { error } = await client.storage
    .from(bucket)
    .upload(objectKey, file, { contentType: "image/tiff", upsert: true });
  if (error) {
    throw new Error(`Failed to upload to storage: ${error.message}`);
  }
  const { data } = client.storage.from(bucket).getPublicUrl(objectKey);
  if (!data?.publicUrl) {
    throw new Error("Unable to resolve public URL for uploaded object");
  }
  return data.publicUrl;
}

async function insertRasterRow(client, payload) {
  const { error } = await client.from("rasters").insert(payload);
  if (error) {
    throw new Error(`Failed to insert rasters row: ${error.message}`);
  }
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log(usage);
    return;
  }

  const options = parseArgs(process.argv.slice(2));
  const resolvedPath = path.resolve(process.cwd(), options.file);
  await fs.access(resolvedPath);

  const supabaseUrl = ensureEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = ensureEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  console.log(`Reading GeoTIFF metadata from ${resolvedPath}`);
  const metadata = await readGeoMetadata(resolvedPath, normaliseEpsg(options.epsg));
  console.log(`Detected footprint in ${metadata.epsg}`);

  const objectKey = resolveObjectKey(options.prefix, options.slug, resolvedPath);
  console.log(`Uploading to storage bucket '${options.bucket}' as '${objectKey}'`);
  const publicUrl = await uploadToStorage(supabase, options.bucket, objectKey, resolvedPath);
  console.log(`Uploaded COG to ${publicUrl}`);

  let acquiredAtIso = null;
  if (options.acquiredAt) {
    const parsed = new Date(options.acquiredAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("--acquired-at must be a valid ISO 8601 timestamp");
    }
    acquiredAtIso = parsed.toISOString();
  }

  const rasterPayload = {
    org_id: options.org,
    type: options.type,
    cog_url: publicUrl,
    footprint: metadata.footprint,
    resolution: metadata.resolution,
    crs: metadata.epsg,
    acquired_at: acquiredAtIso,
    farm_id: options.farm ?? null
  };

  console.log("Writing rasters metadata row in Supabase");
  await insertRasterRow(supabase, rasterPayload);
  console.log("Raster ingestion complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
