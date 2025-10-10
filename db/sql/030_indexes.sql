-- Spatial and relational indexes to support performant queries

-- Organizations
CREATE INDEX IF NOT EXISTS organizations_name_idx ON organizations (name);

-- Membership lookups
CREATE INDEX IF NOT EXISTS org_memberships_user_idx ON org_memberships (user_id);

-- Farms
CREATE INDEX IF NOT EXISTS farms_org_idx ON farms (org_id);
CREATE INDEX IF NOT EXISTS farms_geom_idx ON farms USING GIST (geom);

-- Fields
CREATE INDEX IF NOT EXISTS fields_org_idx ON fields (org_id);
CREATE INDEX IF NOT EXISTS fields_farm_idx ON fields (farm_id);
CREATE INDEX IF NOT EXISTS fields_geom_idx ON fields USING GIST (geom);

-- Buildings
CREATE INDEX IF NOT EXISTS buildings_org_idx ON buildings (org_id);
CREATE INDEX IF NOT EXISTS buildings_farm_idx ON buildings (farm_id);
CREATE INDEX IF NOT EXISTS buildings_geom_idx ON buildings USING GIST (geom);

-- Greenhouses
CREATE INDEX IF NOT EXISTS greenhouses_org_idx ON greenhouses (org_id);
CREATE INDEX IF NOT EXISTS greenhouses_building_idx ON greenhouses (building_id);
CREATE INDEX IF NOT EXISTS greenhouses_geom_idx ON greenhouses USING GIST (geom);

-- Greenhouse areas
CREATE INDEX IF NOT EXISTS greenhouse_areas_org_idx ON greenhouse_areas (org_id);
CREATE INDEX IF NOT EXISTS greenhouse_areas_greenhouse_idx ON greenhouse_areas (greenhouse_id);
CREATE INDEX IF NOT EXISTS greenhouse_areas_geom_idx ON greenhouse_areas USING GIST (geom);

-- Rasters
CREATE INDEX IF NOT EXISTS rasters_org_idx ON rasters (org_id);
CREATE INDEX IF NOT EXISTS rasters_farm_idx ON rasters (farm_id);
CREATE INDEX IF NOT EXISTS rasters_type_idx ON rasters (type);
CREATE INDEX IF NOT EXISTS rasters_footprint_geom_idx ON rasters USING GIST (footprint);

-- Attachments
CREATE INDEX IF NOT EXISTS attachments_org_idx ON attachments (org_id);
CREATE INDEX IF NOT EXISTS attachments_entity_idx ON attachments (entity_table, entity_id);

-- Audit log
CREATE INDEX IF NOT EXISTS audit_log_org_idx ON audit_log (org_id);
CREATE INDEX IF NOT EXISTS audit_log_table_row_idx ON audit_log (table_name, row_id);
