create table if not exists public.app_state (
  id integer primary key default 1 check (id = 1),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;
grant select, insert, update on public.app_state to anon, authenticated;

drop policy if exists "demo app state readable" on public.app_state;
create policy "demo app state readable" on public.app_state for select to anon, authenticated using (true);

drop policy if exists "demo app state writable" on public.app_state;
create policy "demo app state writable" on public.app_state for insert to anon, authenticated with check (true);
create policy "demo app state updatable" on public.app_state for update to anon, authenticated using (true) with check (true);
