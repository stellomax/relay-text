-- Relay Text database setup
-- Run in Supabase: SQL Editor → New query → paste all of this → Run.
-- Safe to run again on an existing database; it won't delete anything.

create extension if not exists pgcrypto;

-- Staff: admins and teachers. Each teacher has their own texting number.
create table if not exists public.staff (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid unique,                 -- Supabase Auth user
  email              text not null unique,        -- stored lowercase
  name               text not null default '',
  school             text,
  role               text not null default 'teacher' check (role in ('admin', 'teacher')),
  status             text not null default 'pending' check (status in ('pending', 'active', 'disabled')),
  area_code          text,                        -- preferred area code for their number
  phone_number       text unique,                 -- E.164
  phone_sid          text,                        -- Twilio number SID (PN...)
  phone_placeholder  boolean not null default false, -- true = demo number, not a real Twilio number
  join_code          text unique,                 -- for the parent sign-up link relaytext.io/join?t=CODE
  last_seen_at       timestamptz,
  created_at         timestamptz not null default now()
);

-- Sign-up codes: an admin creates a 5-digit code for each new teacher, who uses it at relaytext.io/signup.
create table if not exists public.invites (
  id          uuid primary key default gen_random_uuid(),
  code        text not null,
  name        text not null default '',
  school      text,
  area_code   text,
  role        text not null default 'teacher' check (role in ('admin', 'teacher')),
  created_by  uuid references public.staff(id) on delete set null,
  used_by     uuid references public.staff(id) on delete set null,
  used_at     timestamptz,
  expires_at  timestamptz not null default (now() + interval '30 days'),
  created_at  timestamptz not null default now()
);
create unique index if not exists invites_open_code_idx on public.invites (code) where used_at is null;

-- Families (parents / guardians). Each belongs to one teacher (or to the shared main number when staff_id is empty).
create table if not exists public.contacts (
  id              uuid primary key default gen_random_uuid(),
  parent_name     text not null,
  child_name      text,
  phone           text not null,                 -- E.164, e.g. +13035551234
  language        text not null default 'es',    -- Google Translate language code
  opted_out       boolean not null default false,
  created_at      timestamptz not null default now()
);

-- Every text, both directions, with the English and the translated version
create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  contact_id       uuid not null references public.contacts(id) on delete cascade,
  direction        text not null check (direction in ('outbound', 'inbound')),
  body_en          text not null,
  body_translated  text,
  language         text,
  status           text,
  error            text,
  twilio_sid       text,
  is_read          boolean not null default true,
  simulated        boolean not null default false,
  sent_by          text,
  created_at       timestamptz not null default now()
);

-- Columns added over time (safe if they already exist)
alter table public.contacts add column if not exists consent_at timestamptz;
alter table public.contacts add column if not exists consent_source text;
alter table public.contacts add column if not exists staff_id uuid references public.staff(id) on delete set null;
alter table public.messages add column if not exists staff_id uuid references public.staff(id) on delete set null;
alter table public.messages add column if not exists from_number text;
alter table public.messages add column if not exists to_number text;

-- A family's phone number is unique per teacher (the same parent can text several teachers).
alter table public.contacts drop constraint if exists contacts_phone_key;
create unique index if not exists contacts_staff_phone_idx
  on public.contacts (coalesce(staff_id, '00000000-0000-0000-0000-000000000000'::uuid), phone);

create index if not exists contacts_staff_idx on public.contacts (staff_id);
create index if not exists contacts_phone_idx on public.contacts (phone);
create index if not exists messages_contact_created_idx on public.messages (contact_id, created_at);
create index if not exists messages_twilio_sid_idx on public.messages (twilio_sid);
create index if not exists messages_staff_idx on public.messages (staff_id, created_at);
create index if not exists messages_to_number_idx on public.messages (to_number, created_at);

-- Locked down: only the app's server (service role key) can read or write.
alter table public.staff    enable row level security;
alter table public.invites  enable row level security;
alter table public.contacts enable row level security;
alter table public.messages enable row level security;
