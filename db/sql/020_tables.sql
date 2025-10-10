-- Core relational tables for the farm GIS platform

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    full_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE org_memberships (
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role org_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (org_id, user_id)
);

CREATE TABLE farms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    geom geometry(MultiPolygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE farms
    ADD CONSTRAINT farms_geom_srid_check CHECK (ST_SRID(geom) = 4326);

CREATE TABLE fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
    name TEXT,
    crop TEXT,
    geom geometry(MultiPolygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE fields
    ADD CONSTRAINT fields_geom_srid_check CHECK (ST_SRID(geom) = 4326);

CREATE TABLE buildings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
    name TEXT,
    btype building_type NOT NULL,
    geom geometry(MultiPolygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE buildings
    ADD CONSTRAINT buildings_geom_srid_check CHECK (ST_SRID(geom) = 4326);

CREATE TABLE greenhouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
    name TEXT,
    geom geometry(MultiPolygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE greenhouses
    ADD CONSTRAINT greenhouses_geom_srid_check CHECK (ST_SRID(geom) = 4326);

CREATE TABLE greenhouse_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    greenhouse_id UUID REFERENCES greenhouses(id) ON DELETE SET NULL,
    name TEXT,
    bench_id TEXT,
    use_type gh_area_use,
    geom geometry(MultiPolygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE greenhouse_areas
    ADD CONSTRAINT greenhouse_areas_geom_srid_check CHECK (ST_SRID(geom) = 4326);

CREATE TABLE rasters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
    type raster_type NOT NULL,
    cog_url TEXT NOT NULL,
    footprint geometry(Polygon, 4326) NOT NULL,
    resolution DOUBLE PRECISION,
    crs TEXT,
    acquired_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rasters
    ADD CONSTRAINT rasters_footprint_srid_check CHECK (ST_SRID(footprint) = 4326);

CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entity_table TEXT NOT NULL,
    entity_id UUID NOT NULL,
    url TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    org_id UUID,
    table_name TEXT NOT NULL,
    row_id UUID,
    op TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id UUID
);
