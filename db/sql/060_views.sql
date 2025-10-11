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

DO $$
DECLARE
    role_name TEXT := 'tileserv';
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        EXECUTE format('GRANT SELECT ON %s TO %I', 'public.v_tiles_farms', role_name);
        EXECUTE format('GRANT SELECT ON %s TO %I', 'public.v_tiles_fields', role_name);
        EXECUTE format('GRANT SELECT ON %s TO %I', 'public.v_tiles_buildings', role_name);
        EXECUTE format('GRANT SELECT ON %s TO %I', 'public.v_tiles_greenhouses', role_name);
        EXECUTE format('GRANT SELECT ON %s TO %I', 'public.v_tiles_greenhouse_areas', role_name);
    END IF;
END
$$;
