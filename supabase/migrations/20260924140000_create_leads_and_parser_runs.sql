create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  industry text not null,
  city text not null,
  website text,
  website_status text,
  phone text,
  email text,
  address text,
  source_url text not null,
  website_need_score integer,
  sales_potential integer,
  business_activity integer,
  opportunity_score integer,
  priority text,
  main_problem text,
  raw_data jsonb not null default '{}'::jsonb,
  source_key text not null,
  parsed_at timestamptz not null default now(),
  unique (source_key)
);

create table if not exists public.parser_runs (
  id uuid primary key default gen_random_uuid(),
  city text,
  industry text,
  requested_limit integer not null,
  found_count integer not null default 0,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;
alter table public.parser_runs enable row level security;

revoke all on public.leads from anon, authenticated;
revoke all on public.parser_runs from anon, authenticated;

create index if not exists leads_city_industry_idx on public.leads (city, industry);
create index if not exists leads_opportunity_idx on public.leads (opportunity_score desc);
