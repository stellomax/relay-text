-- Relay Text database setup (phase 1)
-- Run once in Supabase: SQL Editor → New query → paste all of this → Run.
-- Safe to run again; it won't delete anything.

create extension if not exists pgcrypto;

-- Families (parents / guardians)
create table if not exists public.contacts (
  id           uuid primary key default gen_random_uuid(),
  parent_name  text not null,
  child_name   text,
  phone        text not null unique,           -- E.164, e.g. +13035551234
  language     text not null default 'es',     -- Google Translate language code
  opted_out    boolean not null default false, -- they replied STOP
  created_at   timestamptz not null default now()
);

-- Every text, both directions, with the English and the translated version
create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  contact_id       uuid not null references public.contacts(id) on delete cascade,
  direction        text not null check (direction in ('outbound', 'inbound')),
  body_en          text not null,   -- English: what staff wrote / read
  body_translated  text,            -- what the parent received / wrote
  language         text,            -- language of body_translated
  status           text,            -- queued, sent, delivered, failed, received, simulated
  error            text,
  twilio_sid       text,
  is_read          boolean not null default true,
  simulated        boolean not null default false,
  sent_by          text,
  created_at       timestamptz not null default now()
);

-- Record of SMS consent (added Oct 31, 2026; safe to run on an existing database)
alter table public.contacts add column if not exists consent_at timestamptz;
alter table public.contacts add column if not exists consent_source text;

create index if not exists messages_contact_created_idx on public.messages (contact_id, created_at);
create index if not exists messages_twilio_sid_idx on public.messages (twilio_sid);

-- Locked down: only the app's server (service role key) can read or write.
alter table public.contacts enable row level security;
alter table public.messages enable row level security;
