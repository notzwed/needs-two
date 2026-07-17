begin;
alter table public.needs_two_solo_games
  add column if not exists completion_reason text
  check (completion_reason in ('solved','timeout','cancelled'));
commit;