# pg_tileserv "Unable to get layer" Troubleshooting

When pg_tileserv returns `Unable to get layer`, the issue is almost always one of the four scenarios below. Work through each section using the same credentials and connection string that pg_tileserv uses.

## 1. View is missing or lives in the wrong database

1. Connect to the database with `psql` using pg_tileserv's exact credentials.
2. Confirm you are in the expected database:

   ```sql
   SELECT current_database();
   ```
3. Verify the view exists in the `public` schema:

   ```sql
   SELECT nspname, relname
   FROM pg_class c
   JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE nspname = 'public' AND relname = 'v_tiles_farms';
   ```

If the query returns no rows, create the view (see [Safe view recreate](#safe-view-recreate)). If pg_tileserv is pointed at the wrong database, fix its `DATABASE_URL`/`PG*` environment variables.

> **Note:** The SQL seed files in [`db/sql`](../db/sql) now create the `public.v_tiles_*` views, grant schema usage, and install
> permissive `tileserv_can_read_*` policies automatically whenever a database role named `tileserv` exists. A matching migration
> in [`db/migrations`](../db/migrations) applies the same setup to existing environments. If your deployment uses a different
> role name, adjust the snippets below accordingly.

## 2. Role lacks privileges on the schema or view

pg_tileserv must be able to `USAGE` the schema and `SELECT` from the view:

```sql
GRANT USAGE ON SCHEMA public TO tileserv;
GRANT SELECT ON public.v_tiles_farms TO tileserv;
```

Re-run the grants whenever the view is recreated.

## 3. Row Level Security blocks the tileserv role

Views run with the caller's permissions. If `v_tiles_farms` reads from a table that has RLS enabled, ensure the tileserv role passes the policies. Grant explicit read access with a permissive policy:

```sql
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'farms'
      AND policyname = 'tileserv_can_read_farms'
  ) THEN
    CREATE POLICY tileserv_can_read_farms
      ON public.farms
      FOR SELECT
      TO tileserv
      USING (true);
  END IF;
END $$;
```

Repeat for every base table referenced by a `v_tiles_*` view. If you require tighter filtering, consider replacing the view with a SECURITY DEFINER function that enforces the filters server-side.

## 4. View shape does not match pg_tileserv expectations

pg_tileserv requires:

- A geometry column (defaults to `geom`, configurable via the `geom` URL parameter).
- A unique identifier column (UUID or integer).
- A consistent SRID on the geometry column (commonly 4326).

Ensure the view exposes the expected column names or alias them appropriately.

## Smoke tests

Run these tests with the tileserv role to confirm visibility and geometry metadata:

```sql
SELECT *
FROM geometry_columns
WHERE f_table_schema = 'public'
  AND f_table_name = 'v_tiles_farms';

SET ROLE tileserv;
SELECT id, ST_SRID(geom)
FROM public.v_tiles_farms
LIMIT 1;
RESET ROLE;
```

If the `SELECT` under `SET ROLE` raises an error, revisit permissions (#2) or RLS (#3). If it returns zero rows without error, RLS is still filtering the dataset.

## Safe view recreate

Use the following snippet to recreate the view with the correct columns and immediately grant access:

```sql
CREATE OR REPLACE VIEW public.v_tiles_farms AS
SELECT id, org_id, name, geom  -- geom must use a fixed SRID (e.g., 4326)
FROM public.farms;

GRANT USAGE ON SCHEMA public TO tileserv;
GRANT SELECT ON public.v_tiles_farms TO tileserv;
```

## One-and-done setup script

Paste the script below to handle view creation, grants, and permissive RLS policies in one go:

```sql
CREATE OR REPLACE VIEW public.v_tiles_farms AS
SELECT id, org_id, name, geom
FROM public.farms;

GRANT USAGE ON SCHEMA public TO tileserv;
GRANT SELECT ON public.v_tiles_farms TO tileserv;

ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'farms'
      AND policyname = 'tileserv_can_read_farms'
  ) THEN
    CREATE POLICY tileserv_can_read_farms
      ON public.farms
      FOR SELECT
      TO tileserv
      USING (true);
  END IF;
END $$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT ON TABLES TO tileserv;
```

## Frontend URL pattern

Requests should follow the pattern:

```
/public.v_tiles_farms/{z}/{x}/{y}.pbf?where=org_id%3D'<org-uuid>'
```

This `where` clause matches what the frontend issues automatically. If the service still responds with `Unable to get layer`, double-check that pg_tileserv connects to the same database where `public.v_tiles_farms` is defined.
