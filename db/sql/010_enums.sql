-- Enumerated types for domain specific attributes
CREATE TYPE org_role AS ENUM ('owner', 'admin', 'editor', 'viewer');

CREATE TYPE building_type AS ENUM ('barn', 'shop', 'shed', 'greenhouse', 'house', 'other');

CREATE TYPE raster_type AS ENUM ('ortho', 'dem');

CREATE TYPE gh_area_use AS ENUM ('bench', 'bed', 'aisle', 'staging', 'other');
