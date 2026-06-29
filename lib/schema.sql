-- Leads Genie — Supabase Schema
-- Run this in your Supabase project SQL editor

-- Users table
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  avatar text,
  google_id text unique,
  plan text default 'free' check (plan in ('free','starter','pro','agency')),
  stripe_customer_id text,
  stripe_subscription_id text,
  sheet_id text,
  country text,
  company text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz default now(),
  last_active_at timestamptz default now()
);

-- Usage tracking table
create table if not exists usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  date date default current_date,
  runs_today int default 0,
  followups_today int default 0,
  prospects_found int default 0,
  emails_sent int default 0,
  api_cost_usd numeric(10,6) default 0,
  unique(user_id, date)
);

-- Plan limits table
create table if not exists plan_limits (
  plan text primary key,
  max_runs_per_day int,
  max_prospects_per_run int,
  max_followups_per_day int,
  max_seats int,
  price_monthly int
);

insert into plan_limits values
  ('free',    1,  3,  10,  1,   0),
  ('starter', 3,  10, 50,  1,   29),
  ('pro',     5,  15, 200, 3,   99),
  ('agency',  999,15, 999, 10,  299)
on conflict (plan) do nothing;

-- Row level security
alter table users enable row level security;
alter table usage enable row level security;

-- Policies — service role bypasses RLS (your server reads everything)
-- Users can only read their own row
create policy "users_own_row" on users for select using (google_id = current_setting('app.google_id', true));
create policy "usage_own_rows" on usage for select using (user_id = (select id from users where google_id = current_setting('app.google_id', true)));
