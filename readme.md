# Farm Geospatial Console

This repository contains the frontend scaffold for the farm geospatial editing console. It is a Next.js (App Router) application that integrates with Supabase authentication, pg_featureserv, pg_tileserv, and TiTiler endpoints for feature management and raster visualization.

## Project Structure

```
apps/web/
  app/
    layout.tsx
    page.tsx
    login/page.tsx
    api/
      features/[layer]/route.ts
      write/[layer]/route.ts
      tiles/[...path]/route.ts
      rasters/[id]/tilejson/route.ts
  components/
  lib/
  styles/
  tests/
```

## Environment Variables

Set the following environment variables for **development**, **preview**, and **production**. Values prefixed with `NEXT_PUBLIC_` are exposed to the browser.

| Name | Scope | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anonymous key |
| `NEXT_PUBLIC_BASEMAP_STYLE_URL` | Public | MapTiler style JSON URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Service role key for RPC write operations |
| `FEATURESERV_BASE` | Server | Base URL for pg_featureserv proxy |
| `TILESERV_BASE` | Server | Base URL for pg_tileserv proxy |
| `NEXT_PUBLIC_TILE_PROXY_BASE` | Public (optional) | Override for the tile template base (defaults to `/api/tiles`) |
| `TITILER_BASE` | Server | Base URL for TiTiler instances |
| `GEO_API_KEY` | Server (optional) | API key forwarded to geo services |

Create `.env.local`, `.env.preview`, and `.env.production` files inside `apps/web/` (or configure hosting provider secrets) with these values.

## Getting Started

Install dependencies:

```
npm install
```

Run the development server:

```
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000). Ensure the environment variables are set before starting.

## Testing

### Unit & API tests

```
npm test
npm run test:api
```

### End-to-end tests

```
# Start the Next.js dev server in another terminal
npm run dev

# Then execute Playwright tests
npm run test:e2e
```

The provided Playwright spec is scaffolded (`test.describe.skip`) and should be enabled once backend fixtures and network mocks are ready.

## Supabase & Authentication

1. Create a Supabase project and note the project URL and anon key.
2. Enable email + password auth. During development you can create a user directly in the Supabase Auth dashboard and set an initial password.
3. The app stores the active Supabase session in browser storage. No additional configuration is required beyond supplying the environment variables above.

## Organizations & Active Org State

The `OrgSwitcher` reads from the `org_memberships` table and expects a foreign relationship to `organizations`. Seed these tables in Supabase so that the authenticated user has at least one membership. The selected organization ID is persisted in `localStorage` and appended to every feature request and RPC payload.

## Geo Services

- `pg_featureserv` is proxied through `/api/features/{layer}`. Every request must include `org_id`; 401/403 responses are surfaced to the UI as "No access for this organization." If your geo stack expects an `x-geo-key` header, set `GEO_API_KEY` so the proxy forwards it automatically. Map the `public.farms` collection to the `public.fs_farms_items(org_id, bbox)` SECURITY DEFINER function so that FeatureServ can query farms without needing the `auth` schema. Grant the executing role (e.g. `featureserv`) permission to run that function.
- `pg_tileserv` tiles are requested through `/api/tiles/{z}/{x}/{y}` by default so that MapLibre loads tiles from the same origin. Override `NEXT_PUBLIC_TILE_PROXY_BASE` if you need to point the frontend at a different tile host. Vector layers are published as the `public.v_tiles_*` views; grant your tile service role SELECT on those views and filter organizations via the `where=org_id='<uuid>'` query parameter as the frontend now does automatically. If pg_tileserv reports `Unable to get layer`, walk through the [troubleshooting checklist](docs/pg_tileserv-troubleshooting.md).
- `TiTiler` COGs are accessed through `/api/rasters/{id}/tilejson`. The route looks up the raster in Supabase, composes an `s3://` URL (default bucket `rasters`), and fetches the TileJSON from `${TITILER_BASE}/cog/tilejson.json`. The proxy also injects `x-geo-key` when configured and caches responses for 30 seconds.

### Rasters & TiTiler

1. Raster metadata lives in the `rasters` table (at minimum: `id`, `org_id`, `key`, and optionally `bucket` or `s3_url`).
2. The frontend composes `s3://rasters/<key>` URLs, requests TileJSON through `/api/rasters/{id}/tilejson?org_id=...`, and renders MapLibre raster layers with `raster-resampling` set per raster definition.
3. Toggle errors are surfaced to the user as "Raster unavailable." so operators know when a COG or TiTiler is unreachable.

### Adding a New Raster

1. Upload the Cloud Optimized GeoTIFF to the `rasters` bucket (or the bucket expected by TiTiler).
2. Insert a row into the Supabase `rasters` table containing the `id`, `org_id`, optional `farm_id` or `type`, and the object storage `key` (or full `s3_url`).
3. The layer registry already exposes toggles for the known raster IDs (`ortho`, `dem_hillshade`). Adding a new row automatically makes the raster available to organizations that reference it.
4. No secrets are exposed to the browser—TileJSON requests are proxied server-side where the `x-geo-key` header is attached when required.

## Running Against Cloud Run / Load Balancer

1. Ensure `FEATURESERV_BASE`, `TILESERV_BASE`, and `TITILER_BASE` point to your Cloud Run load balancer hostnames.
2. If the services require an `x-geo-key` header, set `GEO_API_KEY` so the proxy forwards it automatically.
3. Confirm CORS is configured server-side to allow the frontend origin.

## Creating a Test User & Setting `activeOrgId`

1. Invite or create a test user via Supabase Auth (email + password).
2. Insert a corresponding row into `org_memberships` linking the user to an organization record.
3. Sign in through `/login`. After authentication, choose the organization from the OrgSwitcher dropdown. The selection persists across sessions.

## Notes

- Editing uses MapLibre Draw with polygon-only modes.
- Feature payloads are validated via Zod before being sent to Supabase RPCs.
- Toast notifications surface RPC validation errors and Row-Level Security denials as specified.
- Raster toggles lazily request TileJSON definitions and cache them with short TTLs.
