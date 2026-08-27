create table if not exists public.arcade_users (
    id uuid primary key default gen_random_uuid(),
    username text not null,
    username_normalized text generated always as (lower(username)) stored unique,
    password_hash text not null,
    display_name text not null default '',
    account_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists public.arcade_sessions (
    token_hash text primary key,
    user_id uuid not null references public.arcade_users(id) on delete cascade,
    expires_at timestamptz not null
);

create index if not exists arcade_sessions_expiry_idx on public.arcade_sessions (expires_at);

create table if not exists public.arcade_bans (
    username_normalized text primary key,
    username text not null,
    reason text not null default '',
    banned_at timestamptz not null default now(),
    banned_by text not null
);

create table if not exists public.arcade_site_effects (
    id integer primary key check (id = 1),
    effect jsonb,
    updated_at timestamptz not null default now()
);

create table if not exists public.arcade_poll_votes (
    poll_id uuid not null,
    voter_id uuid not null,
    option text not null,
    voted_at timestamptz not null default now(),
    primary key (poll_id, voter_id)
);

insert into public.arcade_site_effects (id, effect)
values (1, null)
on conflict (id) do nothing;

alter table public.arcade_users enable row level security;
alter table public.arcade_sessions enable row level security;
alter table public.arcade_bans enable row level security;
alter table public.arcade_poll_votes enable row level security;

revoke all on public.arcade_users from anon, authenticated;
revoke all on public.arcade_sessions from anon, authenticated;
revoke all on public.arcade_bans from anon, authenticated;
revoke all on public.arcade_poll_votes from anon, authenticated;

grant usage on schema public to service_role;
grant all on public.arcade_users, public.arcade_sessions to service_role;
grant all on public.arcade_site_effects to service_role;
grant all on public.arcade_bans to service_role;
grant all on public.arcade_poll_votes to service_role;
