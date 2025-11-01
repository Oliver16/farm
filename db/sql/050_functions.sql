-- Stored procedures for vector layer upserts

CREATE OR REPLACE FUNCTION public.farms_upsert(feature_json JSONB, props_json JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    target_id UUID;
    farm_row farms%ROWTYPE;
    geom geometry(MultiPolygon, 4326);
    raw_geom geometry;
BEGIN
    IF feature_json IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'feature_json is required';
    END IF;

    IF props_json IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'props_json is required';
    END IF;

    IF props_json->>'org_id' IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'org_id is required';
    END IF;

    raw_geom := ST_SetSRID(ST_GeomFromGeoJSON(feature_json->>'geometry'), 4326);
    IF raw_geom IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'geometry is invalid';
    END IF;

    geom := CASE
        WHEN GeometryType(raw_geom) = 'POLYGON' THEN ST_Multi(raw_geom)
        ELSE raw_geom::geometry(MultiPolygon, 4326)
    END;

    target_id := COALESCE(
        NULLIF(props_json->>'id', '')::UUID,
        NULLIF(feature_json #>> '{properties,id}', '')::UUID,
        uuid_generate_v4()
    );

    INSERT INTO farms AS f (id, org_id, name, geom)
    VALUES (
        target_id,
        (props_json->>'org_id')::UUID,
        props_json->>'name',
        geom
    )
    ON CONFLICT (id) DO UPDATE
        SET
            org_id = EXCLUDED.org_id,
            name = EXCLUDED.name,
            geom = EXCLUDED.geom,
            updated_at = now()
    RETURNING f.*
    INTO farm_row;

    RETURN jsonb_build_object(
        'type', 'Feature',
        'id', farm_row.id,
        'geometry', ST_AsGeoJSON(farm_row.geom)::JSONB,
        'properties', to_jsonb(farm_row) - 'geom'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.farms_delete(p_rid UUID, p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM public.farms f
    WHERE f.id = p_rid
      AND f.org_id = p_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fields_upsert(feature_json JSONB, props_json JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    target_id UUID;
    field_row fields%ROWTYPE;
    geom geometry(MultiPolygon, 4326);
    raw_geom geometry;
BEGIN
    IF feature_json IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'feature_json is required';
    END IF;

    IF props_json IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'props_json is required';
    END IF;

    IF props_json->>'org_id' IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'org_id is required';
    END IF;

    raw_geom := ST_SetSRID(ST_GeomFromGeoJSON(feature_json->>'geometry'), 4326);
    IF raw_geom IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'geometry is invalid';
    END IF;

    geom := CASE
        WHEN GeometryType(raw_geom) = 'POLYGON' THEN ST_Multi(raw_geom)
        ELSE raw_geom::geometry(MultiPolygon, 4326)
    END;

    target_id := COALESCE(
        NULLIF(props_json->>'id', '')::UUID,
        NULLIF(feature_json #>> '{properties,id}', '')::UUID,
        uuid_generate_v4()
    );

    INSERT INTO fields AS f (id, org_id, farm_id, name, crop, geom)
    VALUES (
        target_id,
        (props_json->>'org_id')::UUID,
        NULLIF(props_json->>'farm_id', '')::UUID,
        NULLIF(props_json->>'name', ''),
        NULLIF(props_json->>'crop', ''),
        geom
    )
    ON CONFLICT (id) DO UPDATE
        SET
            org_id = EXCLUDED.org_id,
            farm_id = EXCLUDED.farm_id,
            name = EXCLUDED.name,
            crop = EXCLUDED.crop,
            geom = EXCLUDED.geom,
            updated_at = now()
    RETURNING f.*
    INTO field_row;

    RETURN jsonb_build_object(
        'type', 'Feature',
        'id', field_row.id,
        'geometry', ST_AsGeoJSON(field_row.geom)::JSONB,
        'properties', to_jsonb(field_row) - 'geom'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fields_delete(p_rid UUID, p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM public.fields f
    WHERE f.id = p_rid
      AND f.org_id = p_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.buildings_upsert(feature_json JSONB, props_json JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    target_id UUID;
    building_row buildings%ROWTYPE;
    geom geometry(MultiPolygon, 4326);
    raw_geom geometry;
    building_type_text TEXT;
BEGIN
    IF feature_json IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'feature_json is required';
    END IF;

    IF props_json IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'props_json is required';
    END IF;

    IF props_json->>'org_id' IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'org_id is required';
    END IF;

    building_type_text := NULLIF(props_json->>'btype', '');
    IF building_type_text IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'btype is required';
    END IF;

    raw_geom := ST_SetSRID(ST_GeomFromGeoJSON(feature_json->>'geometry'), 4326);
    IF raw_geom IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'geometry is invalid';
    END IF;

    geom := CASE
        WHEN GeometryType(raw_geom) = 'POLYGON' THEN ST_Multi(raw_geom)
        ELSE raw_geom::geometry(MultiPolygon, 4326)
    END;

    target_id := COALESCE(
        NULLIF(props_json->>'id', '')::UUID,
        NULLIF(feature_json #>> '{properties,id}', '')::UUID,
        uuid_generate_v4()
    );

    INSERT INTO buildings AS b (id, org_id, farm_id, name, btype, geom)
    VALUES (
        target_id,
        (props_json->>'org_id')::UUID,
        NULLIF(props_json->>'farm_id', '')::UUID,
        NULLIF(props_json->>'name', ''),
        (building_type_text)::building_type,
        geom
    )
    ON CONFLICT (id) DO UPDATE
        SET
            org_id = EXCLUDED.org_id,
            farm_id = EXCLUDED.farm_id,
            name = EXCLUDED.name,
            btype = EXCLUDED.btype,
            geom = EXCLUDED.geom,
            updated_at = now()
    RETURNING b.*
    INTO building_row;

    RETURN jsonb_build_object(
        'type', 'Feature',
        'id', building_row.id,
        'geometry', ST_AsGeoJSON(building_row.geom)::JSONB,
        'properties', to_jsonb(building_row) - 'geom'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.buildings_delete(p_rid UUID, p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM public.buildings b
    WHERE b.id = p_rid
      AND b.org_id = p_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.greenhouses_upsert(feature_json JSONB, props_json JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    target_id UUID;
    greenhouse_row greenhouses%ROWTYPE;
    geom geometry(MultiPolygon, 4326);
    raw_geom geometry;
BEGIN
    IF feature_json IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'feature_json is required';
    END IF;

    IF props_json IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'props_json is required';
    END IF;

    IF props_json->>'org_id' IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'org_id is required';
    END IF;

    raw_geom := ST_SetSRID(ST_GeomFromGeoJSON(feature_json->>'geometry'), 4326);
    IF raw_geom IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'geometry is invalid';
    END IF;

    geom := CASE
        WHEN GeometryType(raw_geom) = 'POLYGON' THEN ST_Multi(raw_geom)
        ELSE raw_geom::geometry(MultiPolygon, 4326)
    END;

    target_id := COALESCE(
        NULLIF(props_json->>'id', '')::UUID,
        NULLIF(feature_json #>> '{properties,id}', '')::UUID,
        uuid_generate_v4()
    );

    INSERT INTO greenhouses AS g (id, org_id, building_id, name, geom)
    VALUES (
        target_id,
        (props_json->>'org_id')::UUID,
        NULLIF(props_json->>'building_id', '')::UUID,
        NULLIF(props_json->>'name', ''),
        geom
    )
    ON CONFLICT (id) DO UPDATE
        SET
            org_id = EXCLUDED.org_id,
            building_id = EXCLUDED.building_id,
            name = EXCLUDED.name,
            geom = EXCLUDED.geom,
            updated_at = now()
    RETURNING g.*
    INTO greenhouse_row;

    RETURN jsonb_build_object(
        'type', 'Feature',
        'id', greenhouse_row.id,
        'geometry', ST_AsGeoJSON(greenhouse_row.geom)::JSONB,
        'properties', to_jsonb(greenhouse_row) - 'geom'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.greenhouses_delete(p_rid UUID, p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM public.greenhouses g
    WHERE g.id = p_rid
      AND g.org_id = p_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.greenhouse_areas_upsert(feature_json JSONB, props_json JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    target_id UUID;
    area_row greenhouse_areas%ROWTYPE;
    geom geometry(MultiPolygon, 4326);
    raw_geom geometry;
    area_use TEXT;
BEGIN
    IF feature_json IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'feature_json is required';
    END IF;

    IF props_json IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'props_json is required';
    END IF;

    IF props_json->>'org_id' IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'org_id is required';
    END IF;

    area_use := NULLIF(props_json->>'use_type', '');
    IF area_use IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'use_type is required';
    END IF;

    raw_geom := ST_SetSRID(ST_GeomFromGeoJSON(feature_json->>'geometry'), 4326);
    IF raw_geom IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'geometry is invalid';
    END IF;

    geom := CASE
        WHEN GeometryType(raw_geom) = 'POLYGON' THEN ST_Multi(raw_geom)
        ELSE raw_geom::geometry(MultiPolygon, 4326)
    END;

    target_id := COALESCE(
        NULLIF(props_json->>'id', '')::UUID,
        NULLIF(feature_json #>> '{properties,id}', '')::UUID,
        uuid_generate_v4()
    );

    INSERT INTO greenhouse_areas AS a (id, org_id, greenhouse_id, name, bench_id, use_type, geom)
    VALUES (
        target_id,
        (props_json->>'org_id')::UUID,
        NULLIF(props_json->>'greenhouse_id', '')::UUID,
        NULLIF(props_json->>'name', ''),
        NULLIF(props_json->>'bench_id', ''),
        (area_use)::gh_area_use,
        geom
    )
    ON CONFLICT (id) DO UPDATE
        SET
            org_id = EXCLUDED.org_id,
            greenhouse_id = EXCLUDED.greenhouse_id,
            name = EXCLUDED.name,
            bench_id = EXCLUDED.bench_id,
            use_type = EXCLUDED.use_type,
            geom = EXCLUDED.geom,
            updated_at = now()
    RETURNING a.*
    INTO area_row;

    RETURN jsonb_build_object(
        'type', 'Feature',
        'id', area_row.id,
        'geometry', ST_AsGeoJSON(area_row.geom)::JSONB,
        'properties', to_jsonb(area_row) - 'geom'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.greenhouse_areas_delete(p_rid UUID, p_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM public.greenhouse_areas ga
    WHERE ga.id = p_rid
      AND ga.org_id = p_org_id;
END;
$$;

-- SECURITY DEFINER wrapper for pg_featureserv so requests no longer rely on
-- RLS policies that touch the auth schema.
CREATE OR REPLACE FUNCTION public.fs_farms_items(
    p_org UUID,
    p_bbox GEOMETRY(Polygon, 4326) DEFAULT NULL
)
RETURNS SETOF public.farms
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT *
    FROM public.farms
    WHERE org_id = p_org
      AND (p_bbox IS NULL OR ST_Intersects(geom, p_bbox));
$$;

REVOKE ALL ON FUNCTION public.fs_farms_items(UUID, geometry) FROM PUBLIC;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'featureserv') THEN
        GRANT EXECUTE ON FUNCTION public.fs_farms_items(UUID, geometry) TO featureserv;
    END IF;
END
$$;
