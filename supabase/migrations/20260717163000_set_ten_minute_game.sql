begin;

alter table public.needs_two_rooms
  alter column remaining_turn_ms set default 10000;

update public.needs_two_rooms
set
  game_ends_at = case
    when game_ends_at is not null and started_at is not null
      then started_at + interval '10 minutes'
    else game_ends_at
  end,
  turn_ends_at = case
    when turn_ends_at is not null
      then turn_ends_at + interval '3 seconds'
    else turn_ends_at
  end,
  remaining_turn_ms = least(10000, remaining_turn_ms + 3000);

do $$
declare
  v_function regprocedure;
  v_definition text;
begin
  foreach v_function in array array[
    'public.needs_two_public_state(public.needs_two_rooms,uuid)'::regprocedure,
    'public.needs_two_create_room(uuid)'::regprocedure,
    'public.needs_two_join_room(text,uuid)'::regprocedure,
    'public.needs_two_advance_room(text,uuid)'::regprocedure,
    'public.needs_two_move_tile(text,uuid,integer)'::regprocedure,
    'public.needs_two_request_rematch(text,uuid)'::regprocedure,
    'public.needs_two_leave_room(text,uuid)'::regprocedure
  ]
  loop
    v_definition := pg_get_functiondef(v_function);
    v_definition := replace(v_definition, '420000', '600000');
    v_definition := replace(v_definition, '7000', '10000');
    v_definition := replace(v_definition, 'interval ''7 seconds''', 'interval ''10 seconds''');
    v_definition := replace(v_definition, 'interval ''7 minutes''', 'interval ''10 minutes''');
    execute v_definition;
  end loop;
end;
$$;

commit;
