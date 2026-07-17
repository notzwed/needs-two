begin;

alter function public.needs_two_solo_state(public.needs_two_solo_games,uuid) volatile;

create or replace function public.needs_two_matchmaking_rate_limit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status='waiting' and new.status='waiting'
    and new.heartbeat_at < old.heartbeat_at + interval '500 milliseconds' then
    raise exception 'Aspetta un momento prima di aggiornare la ricerca.';
  end if;
  return new;
end $$;

drop trigger if exists needs_two_matchmaking_rate_limit on public.needs_two_matchmaking_queue;
create trigger needs_two_matchmaking_rate_limit
before update on public.needs_two_matchmaking_queue
for each row execute function public.needs_two_matchmaking_rate_limit();

do $$
declare v_function regprocedure; v_definition text;
begin
  foreach v_function in array array[
    'public.needs_two_join_room(text,uuid)'::regprocedure,
    'public.needs_two_request_rematch(text,uuid)'::regprocedure
  ] loop
    v_definition:=pg_get_functiondef(v_function);
    v_definition:=replace(v_definition,'interval ''1 second''','interval ''2 seconds''');
    execute v_definition;
  end loop;
end $$;

commit;
