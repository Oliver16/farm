-- Row level security policies enforcing organization membership and roles

CREATE OR REPLACE FUNCTION is_superuser(check_user UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM superusers s
        WHERE s.user_id = check_user
    );
$$;

CREATE OR REPLACE FUNCTION has_org_role(target_org_id UUID, allowed_roles org_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT
        is_superuser()
        OR EXISTS (
            SELECT 1
            FROM org_memberships m
            WHERE m.org_id = target_org_id
              AND m.user_id = auth.uid()
              AND m.role = ANY(allowed_roles)
        );
$$;

CREATE OR REPLACE FUNCTION is_org_member(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT
        is_superuser()
        OR EXISTS (
            SELECT 1
            FROM org_memberships m
            WHERE m.org_id = target_org_id
              AND m.user_id = auth.uid()
        );
$$;

-- Enable RLS on asset tables
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE greenhouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE greenhouse_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE rasters ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Read policies (any member can read)
CREATE POLICY farms_select ON farms
    FOR SELECT
    USING (is_org_member(org_id));

CREATE POLICY fields_select ON fields
    FOR SELECT
    USING (is_org_member(org_id));

CREATE POLICY buildings_select ON buildings
    FOR SELECT
    USING (is_org_member(org_id));

CREATE POLICY greenhouses_select ON greenhouses
    FOR SELECT
    USING (is_org_member(org_id));

CREATE POLICY greenhouse_areas_select ON greenhouse_areas
    FOR SELECT
    USING (is_org_member(org_id));

CREATE POLICY rasters_select ON rasters
    FOR SELECT
    USING (is_org_member(org_id));

CREATE POLICY attachments_select ON attachments
    FOR SELECT
    USING (is_org_member(org_id));

-- Write policies (editor, admin, owner)
CREATE POLICY farms_modify ON farms
    FOR ALL
    USING (has_org_role(org_id, ARRAY['editor','admin','owner']::org_role[]))
    WITH CHECK (has_org_role(org_id, ARRAY['editor','admin','owner']::org_role[]));

CREATE POLICY fields_modify ON fields
    FOR ALL
    USING (has_org_role(org_id, ARRAY['editor','admin','owner']::org_role[]))
    WITH CHECK (has_org_role(org_id, ARRAY['editor','admin','owner']::org_role[]));

CREATE POLICY buildings_modify ON buildings
    FOR ALL
    USING (has_org_role(org_id, ARRAY['editor','admin','owner']::org_role[]))
    WITH CHECK (has_org_role(org_id, ARRAY['editor','admin','owner']::org_role[]));

CREATE POLICY greenhouses_modify ON greenhouses
    FOR ALL
    USING (has_org_role(org_id, ARRAY['editor','admin','owner']::org_role[]))
    WITH CHECK (has_org_role(org_id, ARRAY['editor','admin','owner']::org_role[]));

CREATE POLICY greenhouse_areas_modify ON greenhouse_areas
    FOR ALL
    USING (has_org_role(org_id, ARRAY['editor','admin','owner']::org_role[]))
    WITH CHECK (has_org_role(org_id, ARRAY['editor','admin','owner']::org_role[]));

CREATE POLICY rasters_modify ON rasters
    FOR ALL
    USING (has_org_role(org_id, ARRAY['editor','admin','owner']::org_role[]))
    WITH CHECK (has_org_role(org_id, ARRAY['editor','admin','owner']::org_role[]));

CREATE POLICY attachments_modify ON attachments
    FOR ALL
    USING (has_org_role(org_id, ARRAY['editor','admin','owner']::org_role[]))
    WITH CHECK (has_org_role(org_id, ARRAY['editor','admin','owner']::org_role[]));
