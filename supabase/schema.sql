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

-- Schools. Each has a reusable 5-digit sign-up code: teachers who sign up with it are assigned to the school.
create table if not exists public.schools (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  district     text,
  area_code    text,                     -- area code for teachers' numbers
  signup_code  text unique,              -- 5 digits; null = no school code
  active       boolean not null default true,  -- false = the school code stops working
  created_at   timestamptz not null default now()
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
-- Address-book groups (e.g. "Period 2", "Soccer") for texting several families at once
alter table public.contacts add column if not exists groups text[] not null default '{}';
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

alter table public.staff   add column if not exists school_id uuid references public.schools(id) on delete set null;
alter table public.invites add column if not exists school_id uuid references public.schools(id) on delete set null;
create index if not exists staff_school_idx on public.staff (school_id);

-- Sample schools (skipped if a school with the same name already exists)
insert into public.schools (name, district, area_code, signup_code) values
  ('Sagewood Middle School',  'Sagewood School District', '303', '12345'),
  ('Elk Elementary',          'Elk Valley Schools',       '970', '22222'),
  ('Aspen Ridge High School', 'Aspen Ridge District',     '970', '33333'),
  ('Cedar Valley Elementary', 'Cedar Valley Unified',     '720', '44444'),
  ('Pinecrest Middle School', 'Pinecrest Public Schools', '719', '55555'),
  ('Riverside Academy',       'Riverside School District','303', '66666')
on conflict (name) do nothing;

-- Link teachers who already have a school name to that school
update public.staff t set school_id = s.id
  from public.schools s
  where t.school_id is null and t.school = s.name;

-- Locked down: only the app's server (service role key) can read or write.
alter table public.staff    enable row level security;
alter table public.invites  enable row level security;
alter table public.schools  enable row level security;
alter table public.contacts enable row level security;
alter table public.messages enable row level security;
