-- Ensure the tileserv role can read vector layers in existing environments
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
