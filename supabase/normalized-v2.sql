alter table public.activities add column if not exists legacy_payload jsonb;
grant select, insert, update, delete on public.activities to anon, authenticated;
