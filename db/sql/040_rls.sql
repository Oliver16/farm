-- Helper for extracting claims without touching the auth schema so that
-- service roles without JWT context can still execute definer functions.
CREATE OR REPLACE FUNCTION public.current_jwt_claim(claim TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    claims JSONB;
BEGIN
    BEGIN
        claims := current_setting('request.jwt.claims', true)::JSONB;
    EXCEPTION
        WHEN others THEN
            RETURN NULL;
    END;

    RETURN claims ->> claim;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_user_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    sub TEXT;
BEGIN
    sub := public.current_jwt_claim('sub');
    IF sub IS NULL OR sub = '' THEN
        RETURN NULL;
    END IF;

    RETURN sub::UUID;
EXCEPTION
    WHEN invalid_text_representation THEN
        RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION is_superuser(check_user UUID DEFAULT public.request_user_id())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM superusers s
        WHERE s.user_id = COALESCE(check_user, public.request_user_id())
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
              AND m.user_id = public.request_user_id()
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
              AND m.user_id = public.request_user_id()
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

CREATE OR REPLACE FUNCTION public.ensure_tileserv_rls_policies(role_name TEXT DEFAULT 'tileserv')
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    target RECORD;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        RETURN;
    END IF;

    FOR target IN
        SELECT *
        FROM (VALUES
            ('farms', 'tileserv_can_read_farms'),
            ('fields', 'tileserv_can_read_fields'),
            ('buildings', 'tileserv_can_read_buildings'),
            ('greenhouses', 'tileserv_can_read_greenhouses'),
            ('greenhouse_areas', 'tileserv_can_read_greenhouse_areas')
        ) AS policies(table_name, policy_name)
    LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = target.table_name
              AND policyname = target.policy_name
        ) THEN
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR SELECT TO %I USING (true);',
                target.policy_name,
                target.table_name,
                role_name
            );
        END IF;
    END LOOP;
END;
$$;

SELECT public.ensure_tileserv_rls_policies();
