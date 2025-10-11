# Raster ingestion checklist

To make a new GeoTIFF cloud-optimized (COG) raster discoverable in the app you can now run the automated ingestion script. It uploads the imagery to Supabase storage, inspects the GeoTIFF metadata, and registers the raster in the database so it appears in the map UI.

## Automated ingestion script

1. Make sure the following environment variables are set for the script:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Run the ingestion command from the repository root (the command is defined in the `web` workspace):

   ```bash
   npm run ingest:ortho --workspace web -- \
     --file /path/to/my-ortho-cog.tif \
     --org 00000000-0000-0000-0000-000000000000 \
     --acquired-at 2025-01-15T00:00:00Z
   ```

   Additional options:

   | Flag | Description |
   | --- | --- |
   | `--bucket` | Supabase storage bucket name (default: `basemaps`). |
   | `--prefix` | Folder inside the bucket (default: `orthos`). |
   | `--slug` | Override the object key name (defaults to the source filename). |
   | `--farm` | Optional `farm_id` to associate with the raster. |
   | `--type` | Raster type (`ortho` or `dem`, default: `ortho`). |
   | `--epsg` | Override the GeoTIFF EPSG code if missing from metadata. |

The script reads the GeoTIFF bounding box, reprojects it to WGS84, and writes the `footprint`, `crs`, and (when available) `resolution` columns. Once the row exists, the `/api/rasters` endpoint and the TileJSON proxy automatically surface the layer for that organization; no additional configuration is required.
