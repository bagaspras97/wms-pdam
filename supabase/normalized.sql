-- Jalankan setelah schema.sql. Struktur ini menjadi target migrasi dari app_state.
create table if not exists public.regions (
  code text primary key,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.hamlets (
  id uuid primary key default gen_random_uuid(),
  region_code text not null references public.regions(code),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(region_code, name)
);

create table if not exists public.repair_codes (
  code text primary key,
  name text not null,
  price_per_point numeric(14,2) not null check (price_per_point > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.tools (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.activities (
  id text primary key,
  name text not null,
  region_code text references public.regions(code),
  hamlet_id uuid references public.hamlets(id),
  target_date date,
  note text not null default '',
  payment_status text not null default 'Belum dibayar' check (payment_status in ('Belum dibayar','Sudah dibayar')),
  paid_at timestamptz,
  payment_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_repairs (
  id uuid primary key default gen_random_uuid(),
  activity_id text not null references public.activities(id) on delete cascade,
  repair_code text not null references public.repair_codes(code),
  points integer not null check (points > 0),
  price_per_point numeric(14,2) not null check (price_per_point > 0),
  total numeric(14,2) generated always as (points * price_per_point) stored,
  unique(activity_id, repair_code)
);

create table if not exists public.activity_tools (
  activity_id text not null references public.activities(id) on delete cascade,
  tool_id uuid not null references public.tools(id),
  primary key(activity_id, tool_id)
);

alter table public.regions enable row level security;
alter table public.hamlets enable row level security;
alter table public.repair_codes enable row level security;
alter table public.tools enable row level security;
alter table public.activities enable row level security;
alter table public.activity_repairs enable row level security;
alter table public.activity_tools enable row level security;

grant select, insert, update, delete on public.regions, public.hamlets, public.repair_codes, public.tools, public.activities, public.activity_repairs, public.activity_tools to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

do $$ declare t text; begin
  foreach t in array array['regions','hamlets','repair_codes','tools','activities','activity_repairs','activity_tools'] loop
    execute format('drop policy if exists "anon read %1$s" on public.%1$s', t);
    execute format('create policy "anon read %1$s" on public.%1$s for select to anon, authenticated using (true)', t);
    execute format('drop policy if exists "anon write %1$s" on public.%1$s', t);
    execute format('create policy "anon write %1$s" on public.%1$s for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;
