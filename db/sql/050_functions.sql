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
