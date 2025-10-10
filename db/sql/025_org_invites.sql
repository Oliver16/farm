create table if not exists org_invitations (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  token text unique not null,
  role org_role not null default 'editor',
  email text,
  single_use boolean not null default true,
  used_at timestamptz,
  expires_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists org_invitations_org_idx on org_invitations(org_id);
create index if not exists org_invitations_token_idx on org_invitations(token);

alter table org_invitations enable row level security;

create policy "sr can do anything" on org_invitations
  for all
  using (true) with check (true);
