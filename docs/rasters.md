# Raster ingestion checklist

To make a new GeoTIFF cloud-optimized (COG) raster discoverable in the app you only need to host it in object storage and register a matching row in the `rasters` table.

1. **Upload the COG** to Supabase storage (or any S3-compatible bucket) and make sure it is publicly accessible to TiTiler. Copy the full HTTPS URL to the `.tif` file.
2. **Insert a raster row** for the organization that owns the imagery. Populate at least the following fields:
   - `org_id`: UUID of the organization.
   - `type`: either `ortho` or `dem` (matches the layer toggle).
   - `cog_url`: the public URL for the GeoTIFF.
   - Optionally set `acquired_at` (timestamp) for UI display; other fields such as `footprint`, `resolution`, and `crs` can be filled later.

Example SQL:

```sql
insert into rasters (org_id, type, cog_url, acquired_at, footprint)
values (
  '00000000-0000-0000-0000-000000000000', -- org UUID
  'ortho',
  'https://<project>.supabase.co/storage/v1/object/public/basemaps/orthos/my-ortho-cog.tif',
  '2025-01-15T00:00:00Z',
  ST_SetSRID(ST_MakeEnvelope(-123.5, 45.5, -123.4, 45.6), 4326)
);
```

Once the row exists, the `/api/rasters` endpoint and the TileJSON proxy will automatically surface the layer for that organization; no additional configuration is required.
