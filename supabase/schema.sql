-- RelayText database setup
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

-- Short school names: "Middle School" → "MS", "High School" → "HS" (Nov 2026). Safe to run again.
update public.schools set name = replace(replace(name, 'Middle School', 'MS'), 'High School', 'HS')
  where name like '%Middle School%' or name like '%High School%';
update public.staff set school = replace(replace(school, 'Middle School', 'MS'), 'High School', 'HS')
  where school like '%Middle School%' or school like '%High School%';
update public.invites set school = replace(replace(school, 'Middle School', 'MS'), 'High School', 'HS')
  where school like '%Middle School%' or school like '%High School%';

-- Sample schools (skipped if a school with the same name already exists)
insert into public.schools (name, district, area_code, signup_code) values
  ('Sagewood MS',            'Sagewood School District', '303', '12345'),
  ('Elk Elementary',          'Elk Valley Schools',       '970', '22222'),
  ('Aspen Ridge HS', 'Aspen Ridge District',     '970', '33333'),
  ('Cedar Valley Elementary', 'Cedar Valley Unified',     '720', '44444'),
  ('Pinecrest MS', 'Pinecrest Public Schools', '719', '55555'),
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

-- ============================================================================
-- Parents list (Nov 2026). Admins keep one list of parents for each school;
-- teachers and admins choose recipients from it and can't add new numbers themselves.
-- A conversation (contacts row) links to the parent it came from.
-- ============================================================================
create table if not exists public.parents (
  id              uuid primary key default gen_random_uuid(),
  parent_name     text not null,
  students        text[] not null default '{}',   -- student names
  phone           text not null,                   -- E.164
  language        text not null default 'es',      -- Google Translate language code
  school_id       uuid references public.schools(id) on delete set null,
  opted_out       boolean not null default false,
  consent_at      timestamptz,
  consent_source  text,
  created_by      uuid references public.staff(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- One entry per phone number in each school.
create unique index if not exists parents_school_phone_idx
  on public.parents (coalesce(school_id, '00000000-0000-0000-0000-000000000000'::uuid), phone);
create index if not exists parents_phone_idx on public.parents (phone);

alter table public.contacts add column if not exists parent_id uuid references public.parents(id) on delete set null;
create index if not exists contacts_parent_idx on public.contacts (parent_id);

-- Groups belong to one teacher (or admin) and aren't shared.
create table if not exists public.parent_groups (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references public.staff(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);
create unique index if not exists parent_groups_staff_name_idx on public.parent_groups (staff_id, lower(name));

create table if not exists public.parent_group_members (
  group_id   uuid not null references public.parent_groups(id) on delete cascade,
  parent_id  uuid not null references public.parents(id) on delete cascade,
  primary key (group_id, parent_id)
);

-- One-time move: put families already saved by teachers into the Parents list, and link their conversations.
insert into public.parents (parent_name, students, phone, language, school_id, opted_out, consent_at, consent_source, created_at)
select distinct on (coalesce(s.school_id, '00000000-0000-0000-0000-000000000000'::uuid), c.phone)
  c.parent_name,
  case when coalesce(trim(c.child_name), '') = '' then '{}'::text[] else array[trim(c.child_name)] end,
  c.phone, c.language, s.school_id, c.opted_out, c.consent_at, c.consent_source, c.created_at
from public.contacts c
left join public.staff s on s.id = c.staff_id
where c.parent_id is null and c.parent_name not like 'Unknown %'
order by coalesce(s.school_id, '00000000-0000-0000-0000-000000000000'::uuid), c.phone, c.consent_at desc nulls last, c.created_at desc
on conflict do nothing;

update public.contacts c set parent_id = p.id
from public.parents p
where c.parent_id is null
  and p.phone = c.phone
  and coalesce(p.school_id, '00000000-0000-0000-0000-000000000000'::uuid)
    = coalesce((select s.school_id from public.staff s where s.id = c.staff_id), '00000000-0000-0000-0000-000000000000'::uuid);

-- Old address-book groups become that teacher's own groups.
insert into public.parent_groups (staff_id, name)
select distinct c.staff_id, g
from public.contacts c, unnest(c.groups) g
where c.staff_id is not null and trim(g) <> ''
on conflict do nothing;

insert into public.parent_group_members (group_id, parent_id)
select distinct pg.id, c.parent_id
from public.contacts c
cross join unnest(c.groups) g
join public.parent_groups pg on pg.staff_id = c.staff_id and lower(pg.name) = lower(g)
where c.parent_id is not null
on conflict do nothing;

alter table public.parents              enable row level security;
alter table public.parent_groups        enable row level security;
alter table public.parent_group_members enable row level security;

-- Requests from the "Bring Relay to your school" form on the website (Nov 2026)
create table if not exists public.school_requests (
  id           uuid primary key default gen_random_uuid(),
  first_name   text not null,
  last_name    text not null,
  email        text not null,
  phone        text,
  role         text,
  organization text not null,       -- school or district
  location     text,                -- city, state
  students     text,                -- size range
  message      text,
  handled      boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists school_requests_created_idx on public.school_requests (created_at desc);
alter table public.school_requests enable row level security;

-- ============================================================================
-- Demo data (Nov 2026). Rows created by Manage Schools → Load demo data are marked demo = true,
-- and Remove demo data deletes only those rows. Safe to run again.
-- ============================================================================
alter table public.staff         add column if not exists demo boolean not null default false;
alter table public.parents       add column if not exists demo boolean not null default false;
alter table public.contacts      add column if not exists demo boolean not null default false;
alter table public.parent_groups add column if not exists demo boolean not null default false;

-- ============================================================================
-- Security (Nov 2026): rate limits and two-step sign-in. Safe to run again.
-- ============================================================================
-- One row per attempt we want to limit (sign-in, sign-up, parent sign-up, forms). Old rows are cleaned up by the app.
create table if not exists public.security_events (
  id          bigint generated always as identity primary key,
  kind        text not null,               -- e.g. 'login_fail', 'optin', 'signup', 'contact', 'forgot', 'mfa_fail'
  key         text not null,               -- e.g. 'ip:1.2.3.4' or 'email:name@school.org'
  created_at  timestamptz not null default now()
);
create index if not exists security_events_lookup_idx on public.security_events (kind, key, created_at desc);
alter table public.security_events enable row level security;

-- Two-step sign-in (authenticator app codes). The secret is stored encrypted by the app.
alter table public.staff add column if not exists mfa_secret  text;
alter table public.staff add column if not exists mfa_enabled boolean not null default false;
