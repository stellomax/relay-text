-- Text Connect database setup
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create extension if not exists pgcrypto;

-- Parents / guardians
create table if not exists public.contacts (
  id           uuid primary key default gen_random_uuid(),
  parent_name  text not null,
  child_name   text,
  phone        text not null unique,          -- E.164, e.g. +13035551234
  language     text not null default 'es',    -- Google Translate language code
  opted_out    boolean not null default false, -- parent replied STOP
  created_at   timestamptz not null default now()
);

-- Saved lists (a convenience label for broadcasts, never a group chat)
create table if not exists public.lists (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists public.list_members (
  list_id     uuid not null references public.lists(id) on delete cascade,
  contact_id  uuid not null references public.contacts(id) on delete cascade,
  primary key (list_id, contact_id)
);

-- Every text, in both directions, with both the English and translated versions
create table if not exists public.messages (
  id                 uuid primary key default gen_random_uuid(),
  contact_id         uuid not null references public.contacts(id) on delete cascade,
  direction          text not null check (direction in ('outbound', 'inbound')),
  body_en            text not null,      -- English (what the teacher wrote / reads)
  body_translated    text,               -- what the parent received / wrote
  language           text,               -- language of body_translated
  status             text,               -- queued, sent, delivered, failed, received, simulated...
  error              text,
  twilio_sid         text,
  is_read            boolean not null default true,
  simulated          boolean not null default false,
  broadcast_list_id  uuid references public.lists(id) on delete set null,
  sent_by            text,
  created_at         timestamptz not null default now()
);

create index if not exists messages_contact_created_idx on public.messages (contact_id, created_at);
create index if not exists messages_twilio_sid_idx on public.messages (twilio_sid);

-- Lock everything down: only the app's server (service role key) can read or write.
-- Browsers never talk to the database directly.
alter table public.contacts     enable row level security;
alter table public.lists        enable row level security;
alter table public.list_members enable row level security;
alter table public.messages     enable row level security;
