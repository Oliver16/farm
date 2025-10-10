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
| `NEXT_PUBLIC_BASEMAP_STYLE_URL` | Public | URL to the MapLibre style referencing PMTiles |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Service role key for RPC write operations |
| `FEATURESERV_BASE` | Server | Base URL for pg_featureserv proxy |
| `TILESERV_BASE` | Server | Base URL for pg_tileserv proxy |
| `TITILER_BASE` | Server | Base URL for TiTiler instances |
| `PMTILES_BASE` | Server | Base URL to Supabase Storage PMTiles bucket |
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
2. Enable Email/Magic Link auth. During development you can create a user via Supabase Auth dashboard or by sending yourself a magic link.
3. The app stores the active Supabase session in browser storage. No additional configuration is required beyond supplying the environment variables above.

## Organizations & Active Org State

The `OrgSwitcher` reads from the `org_memberships` table and expects a foreign relationship to `organizations`. Seed these tables in Supabase so that the authenticated user has at least one membership. The selected organization ID is persisted in `localStorage` and appended to every feature request and RPC payload.

## Geo Services

- `pg_featureserv` is proxied through `/api/features/{layer}`.
- `pg_tileserv` can be proxied through `/api/tiles/*` (or consumed directly by MapLibre).
- `TiTiler` is proxied through `/api/rasters/{id}/tilejson` which builds a TileJSON response pointing to the configured COG.

## Running Against Cloud Run / Load Balancer

1. Ensure `FEATURESERV_BASE`, `TILESERV_BASE`, and `TITILER_BASE` point to your Cloud Run load balancer hostnames.
2. If the services require an `x-geo-key` header, set `GEO_API_KEY` so the proxy forwards it automatically.
3. Confirm CORS is configured server-side to allow the frontend origin.

## Creating a Test User & Setting `activeOrgId`

1. Invite or create a test user via Supabase Auth (email magic link).
2. Insert a corresponding row into `org_memberships` linking the user to an organization record.
3. Sign in through `/login`. After authentication, choose the organization from the OrgSwitcher dropdown. The selection persists across sessions.

## Notes

- Editing uses MapLibre Draw with polygon-only modes.
- Feature payloads are validated via Zod before being sent to Supabase RPCs.
- Toast notifications surface RPC validation errors and Row-Level Security denials as specified.
- Raster toggles lazily request TileJSON definitions and cache them with short TTLs.
