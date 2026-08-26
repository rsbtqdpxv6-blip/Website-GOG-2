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

alter table public.arcade_users enable row level security;
alter table public.arcade_sessions enable row level security;

revoke all on public.arcade_users from anon, authenticated;
revoke all on public.arcade_sessions from anon, authenticated;

grant usage on schema public to service_role;
grant all on public.arcade_users, public.arcade_sessions to service_role;
