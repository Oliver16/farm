-- Views to expose simplified layers for pg_tileserv without referencing auth schema

CREATE OR REPLACE VIEW public.v_tiles_farms AS
SELECT id, org_id, name, geom
FROM public.farms;

CREATE OR REPLACE VIEW public.v_tiles_fields AS
SELECT id, org_id, farm_id, name, crop, geom
FROM public.fields;

CREATE OR REPLACE VIEW public.v_tiles_buildings AS
SELECT id, org_id, farm_id, name, btype, geom
FROM public.buildings;

CREATE OR REPLACE VIEW public.v_tiles_greenhouses AS
SELECT id, org_id, building_id, name, geom
FROM public.greenhouses;

CREATE OR REPLACE VIEW public.v_tiles_greenhouse_areas AS
SELECT id, org_id, greenhouse_id, name, bench_id, use_type, geom
FROM public.greenhouse_areas;

CREATE OR REPLACE FUNCTION public.ensure_tileserv_view_grants(role_name TEXT DEFAULT 'tileserv')
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    view_row RECORD;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        RETURN;
    END IF;

    EXECUTE format('GRANT USAGE ON SCHEMA %I TO %I', 'public', role_name);

    FOR view_row IN
        SELECT *
        FROM (VALUES
            ('v_tiles_farms'),
            ('v_tiles_fields'),
            ('v_tiles_buildings'),
            ('v_tiles_greenhouses'),
            ('v_tiles_greenhouse_areas')
        ) AS views(view_name)
    LOOP
        IF EXISTS (
            SELECT 1
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relname = view_row.view_name
        ) THEN
            EXECUTE format('GRANT SELECT ON %I.%I TO %I', 'public', view_row.view_name, role_name);
        END IF;
    END LOOP;

    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT ON TABLES TO %I', 'public', role_name);
END;
$$;

SELECT public.ensure_tileserv_view_grants();
