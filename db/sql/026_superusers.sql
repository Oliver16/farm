-- Ensure the superusers table and permission helpers exist for older environments

create table if not exists superusers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id)
);

create or replace function is_superuser(check_user uuid default auth.uid())
returns boolean
language sql
stable
as $$
    select exists (
        select 1
        from superusers s
        where s.user_id = check_user
    );
$$;

create or replace function has_org_role(target_org_id uuid, allowed_roles org_role[])
returns boolean
language sql
stable
as $$
    select
        is_superuser()
        or exists (
            select 1
            from org_memberships m
            where m.org_id = target_org_id
              and m.user_id = auth.uid()
              and m.role = any(allowed_roles)
        );
$$;

create or replace function is_org_member(target_org_id uuid)
returns boolean
language sql
stable
as $$
    select
        is_superuser()
        or exists (
            select 1
            from org_memberships m
            where m.org_id = target_org_id
              and m.user_id = auth.uid()
        );
$$;
