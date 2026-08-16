alter table public.activities add column if not exists legacy_payload jsonb;
grant select, insert, update, delete on public.activities to anon, authenticated;

create table if not exists public.officials (
  id integer primary key default 1 check (id = 1),
  kasubag_name text not null default '',
  kepala_bagian_name text not null default '',
  admin_name text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.officials add column if not exists admin_name text not null default '';
alter table public.officials enable row level security;
grant select, insert, update, delete on public.officials to anon, authenticated;
drop policy if exists "anon read officials" on public.officials;
create policy "anon read officials" on public.officials for select to anon, authenticated using (true);
drop policy if exists "anon write officials" on public.officials;
create policy "anon write officials" on public.officials for all to anon, authenticated using (true) with check (true);
