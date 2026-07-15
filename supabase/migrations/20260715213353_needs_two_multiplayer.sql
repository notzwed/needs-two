begin;

create table if not exists public.needs_two_rooms (
  code text primary key check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  player1_id uuid not null,
  player2_id uuid,
  player1_connected boolean not null default true,
  player2_connected boolean not null default false,
  player1_last_seen timestamptz default clock_timestamp(),
  player2_last_seen timestamptz,
  player1_rematch boolean not null default false,
  player2_rematch boolean not null default false,
  board smallint[] not null,
  empty_position smallint not null check (empty_position between 0 and 15),
  active_player smallint not null default 1 check (active_player in (1, 2)),
  phase text not null default 'waiting' check (phase in ('waiting', 'starting', 'transition', 'playing', 'paused', 'completed')),
  puzzle_id text not null,
  move_count integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  turn_ends_at timestamptz,
  transition_ends_at timestamptz,
  elapsed_ms bigint not null default 0,
  remaining_turn_ms bigint not null default 420000,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint needs_two_board_length check (cardinality(board) = 15)
);

alter table public.needs_two_rooms enable row level security;
revoke all on table public.needs_two_rooms from anon, authenticated;

create or replace function public.needs_two_random_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::integer, 1), '')
  from generate_series(1, 6);
$$;

create or replace function public.needs_two_puzzle_id(p_previous text default null)
returns text
language sql
volatile
set search_path = ''
as $$
  select puzzle
  from unnest(array[
    'cottage', 'red-panda', 'pond', 'mountain-lake', 'seaside-cove',
    'autumn-forest', 'snowy-village', 'desert-oasis', 'flower-field',
    'waterfall', 'balloon-valley', 'lighthouse', 'mushroom-forest',
    'sleepy-fox', 'cozy-cat', 'happy-corgi', 'river-otters',
    'garden-bunny', 'hedgehog-picnic', 'pond-frog', 'penguin-pair',
    'ocean-whale', 'sea-turtle', 'secret-garden', 'apple-orchard',
    'sunflower-day', 'tropical-island', 'koi-garden', 'cozy-camp',
    'rainbow-valley', 'little-bakery', 'treehouse', 'sailboat-bay'
  ]::text[]) puzzle
  where p_previous is null or puzzle <> p_previous
  order by random()
  limit 1;
$$;

create or replace function public.needs_two_shuffle_board()
returns table(shuffled_board smallint[], shuffled_empty smallint)
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_previous_empty smallint;
  v_candidates smallint[];
  v_chosen smallint;
  v_tile_index integer;
  v_displaced integer;
  v_attempt integer := 0;
begin
  loop
    v_attempt := v_attempt + 1;
    shuffled_board := array(select generate_series(0, 14)::smallint);
    shuffled_empty := 15;
    v_previous_empty := -1;

    for v_step in 1..180 loop
      select array_agg(position::smallint)
      into v_candidates
      from generate_series(0, 15) position
      where (
        abs((position / 4) - (shuffled_empty / 4))
        + abs(mod(position, 4) - mod(shuffled_empty, 4))
      ) = 1
      and position <> v_previous_empty;

      v_chosen := v_candidates[1 + floor(random() * cardinality(v_candidates))::integer];
      v_tile_index := array_position(shuffled_board, v_chosen);
      v_previous_empty := shuffled_empty;
      shuffled_board[v_tile_index] := shuffled_empty;
      shuffled_empty := v_chosen;
    end loop;

    select count(*) into v_displaced
    from generate_subscripts(shuffled_board, 1) index
    where shuffled_board[index] <> index - 1;

    exit when v_displaced >= 8 or v_attempt >= 12;
  end loop;

  return next;
end;
$$;

create or replace function public.needs_two_public_state(p_room public.needs_two_rooms, p_session_id uuid)
returns jsonb
language sql
volatile
set search_path = ''
as $$
  select jsonb_build_object(
    'code', p_room.code,
    'players',
      jsonb_build_array(jsonb_build_object(
        'id', case when p_room.player1_id = p_session_id then p_session_id::text else 'player-1' end,
        'number', 1,
        'connected', p_room.player1_connected,
        'rematchReady', p_room.player1_rematch
      )) ||
      case when p_room.player2_id is not null then
        jsonb_build_array(jsonb_build_object(
          'id', case when p_room.player2_id = p_session_id then p_session_id::text else 'player-2' end,
          'number', 2,
          'connected', p_room.player2_connected,
          'rematchReady', p_room.player2_rematch
        ))
      else '[]'::jsonb end,
    'game', jsonb_build_object(
      'size', 4,
      'board', (
        select jsonb_agg(jsonb_build_object(
          'id', index - 1,
          'correctPosition', index - 1,
          'position', p_room.board[index]
        ) order by index)
        from generate_subscripts(p_room.board, 1) index
      ),
      'emptyPosition', p_room.empty_position,
      'activePlayer', p_room.active_player,
      'phase', p_room.phase,
      'puzzleId', p_room.puzzle_id,
      'moveCount', p_room.move_count,
      'startedAt', case when p_room.started_at is null then null else floor(extract(epoch from p_room.started_at) * 1000)::bigint end,
      'completedAt', case when p_room.completed_at is null then null else floor(extract(epoch from p_room.completed_at) * 1000)::bigint end,
      'turnEndsAt', case when p_room.turn_ends_at is null then null else floor(extract(epoch from p_room.turn_ends_at) * 1000)::bigint end,
      'transitionEndsAt', case when p_room.transition_ends_at is null then null else floor(extract(epoch from p_room.transition_ends_at) * 1000)::bigint end,
      'elapsedMs', case
        when p_room.phase in ('paused', 'completed') then p_room.elapsed_ms
        when p_room.started_at is null then 0
        else greatest(0, floor(extract(epoch from (clock_timestamp() - p_room.started_at)) * 1000)::bigint)
      end
    ),
    'serverTime', floor(extract(epoch from clock_timestamp()) * 1000)::bigint
  );
$$;

create or replace function public.needs_two_create_room(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_board smallint[];
  v_empty smallint;
  v_room public.needs_two_rooms%rowtype;
begin
  delete from public.needs_two_rooms
  where updated_at < clock_timestamp() - interval '24 hours';

  select shuffled_board, shuffled_empty
  into v_board, v_empty
  from public.needs_two_shuffle_board();

  loop
    v_code := public.needs_two_random_code();
    exit when not exists (select 1 from public.needs_two_rooms where code = v_code);
  end loop;

  insert into public.needs_two_rooms (
    code, player1_id, board, empty_position, puzzle_id
  ) values (
    v_code, p_session_id, v_board, v_empty, public.needs_two_puzzle_id()
  )
  returning * into v_room;

  return public.needs_two_public_state(v_room, p_session_id);
end;
$$;

create or replace function public.needs_two_join_room(p_code text, p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.needs_two_rooms%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  select * into v_room
  from public.needs_two_rooms
  where code = upper(p_code)
  for update;

  if not found then
    raise exception 'Questa stanza non esiste piu.';
  end if;

  if v_room.player1_id = p_session_id then
    update public.needs_two_rooms
    set player1_connected = true, player1_last_seen = v_now, updated_at = v_now
    where code = v_room.code;
  elsif v_room.player2_id = p_session_id then
    update public.needs_two_rooms
    set player2_connected = true, player2_last_seen = v_now, updated_at = v_now
    where code = v_room.code;
  elsif v_room.player2_id is not null then
    raise exception 'Questa stanza e gia piena.';
  else
    update public.needs_two_rooms
    set player2_id = p_session_id,
        player2_connected = true,
        player2_last_seen = v_now,
        phase = 'starting',
        transition_ends_at = v_now + interval '1 second',
        turn_ends_at = null,
        player1_rematch = false,
        player2_rematch = false,
        updated_at = v_now
    where code = v_room.code;
  end if;

  select * into v_room from public.needs_two_rooms where code = v_room.code for update;

  if v_room.phase = 'paused' and v_room.player1_connected and v_room.player2_connected then
    update public.needs_two_rooms
    set phase = 'transition',
        transition_ends_at = v_now + interval '800 milliseconds',
        turn_ends_at = v_now + interval '800 milliseconds' + (v_room.remaining_turn_ms * interval '1 millisecond'),
        started_at = case when v_room.started_at is null then v_now else v_now - (v_room.elapsed_ms * interval '1 millisecond') end,
        updated_at = v_now
    where code = v_room.code;
  end if;

  select * into v_room from public.needs_two_rooms where code = v_room.code;
  return public.needs_two_public_state(v_room, p_session_id);
end;
$$;

create or replace function public.needs_two_get_room(p_code text, p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.needs_two_rooms%rowtype;
begin
  select * into v_room from public.needs_two_rooms where code = upper(p_code);

  if not found or (p_session_id <> v_room.player1_id and (v_room.player2_id is null or p_session_id <> v_room.player2_id)) then
    raise exception 'Non fai parte di questa stanza.';
  end if;

  return public.needs_two_public_state(v_room, p_session_id);
end;
$$;

create or replace function public.needs_two_heartbeat(p_code text, p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.needs_two_rooms%rowtype;
  v_now timestamptz := clock_timestamp();
  v_changed boolean := false;
begin
  select * into v_room from public.needs_two_rooms where code = upper(p_code) for update;

  if not found or (p_session_id <> v_room.player1_id and (v_room.player2_id is null or p_session_id <> v_room.player2_id)) then
    raise exception 'Non fai parte di questa stanza.';
  end if;

  if p_session_id = v_room.player1_id then
    update public.needs_two_rooms
    set player1_connected = true, player1_last_seen = v_now, updated_at = v_now
    where code = v_room.code;
    v_changed := not v_room.player1_connected;
  else
    update public.needs_two_rooms
    set player2_connected = true, player2_last_seen = v_now, updated_at = v_now
    where code = v_room.code;
    v_changed := not v_room.player2_connected;
  end if;

  select * into v_room from public.needs_two_rooms where code = v_room.code for update;

  if v_room.phase = 'paused' and v_room.player1_connected and v_room.player2_connected then
    update public.needs_two_rooms
    set phase = 'transition',
        transition_ends_at = v_now + interval '800 milliseconds',
        turn_ends_at = v_now + interval '800 milliseconds' + (v_room.remaining_turn_ms * interval '1 millisecond'),
        started_at = case when v_room.started_at is null then v_now else v_now - (v_room.elapsed_ms * interval '1 millisecond') end,
        updated_at = v_now
    where code = v_room.code;
    v_changed := true;
  end if;

  select * into v_room from public.needs_two_rooms where code = v_room.code;
  return jsonb_build_object('state', public.needs_two_public_state(v_room, p_session_id), 'changed', v_changed);
end;
$$;

create or replace function public.needs_two_advance_room(p_code text, p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.needs_two_rooms%rowtype;
  v_now timestamptz := clock_timestamp();
  v_changed boolean := false;
begin
  select * into v_room from public.needs_two_rooms where code = upper(p_code) for update;

  if not found or (p_session_id <> v_room.player1_id and (v_room.player2_id is null or p_session_id <> v_room.player2_id)) then
    raise exception 'Non fai parte di questa stanza.';
  end if;

  if p_session_id = v_room.player1_id then
    v_room.player1_connected := true;
    v_room.player1_last_seen := v_now;
  else
    v_room.player2_connected := true;
    v_room.player2_last_seen := v_now;
  end if;

  if v_room.player1_last_seen < v_now - interval '20 seconds' then
    v_room.player1_connected := false;
  end if;
  if v_room.player2_id is not null and (v_room.player2_last_seen is null or v_room.player2_last_seen < v_now - interval '20 seconds') then
    v_room.player2_connected := false;
  end if;

  if v_room.phase in ('starting', 'transition', 'playing')
     and (not v_room.player1_connected or not v_room.player2_connected) then
    v_room.elapsed_ms := case when v_room.started_at is null then v_room.elapsed_ms else greatest(0, floor(extract(epoch from (v_now - v_room.started_at)) * 1000)::bigint) end;
    v_room.remaining_turn_ms := case when v_room.turn_ends_at is null then 420000 else greatest(0, floor(extract(epoch from (v_room.turn_ends_at - v_now)) * 1000)::bigint) end;
    v_room.phase := 'paused';
    v_room.turn_ends_at := null;
    v_room.transition_ends_at := null;
    v_changed := true;
  elsif v_room.phase = 'starting' and v_room.transition_ends_at is not null and v_now >= v_room.transition_ends_at then
    v_room.phase := 'transition';
    v_room.started_at := v_now;
    v_room.elapsed_ms := 0;
    v_room.transition_ends_at := v_now + interval '800 milliseconds';
    v_room.turn_ends_at := v_now + interval '800 milliseconds' + interval '7 minutes';
    v_room.remaining_turn_ms := 420000;
    v_changed := true;
  elsif v_room.phase = 'transition' and v_room.transition_ends_at is not null and v_now >= v_room.transition_ends_at then
    v_room.phase := 'playing';
    v_room.transition_ends_at := null;
    v_changed := true;
  elsif v_room.phase = 'playing' and v_room.turn_ends_at is not null and v_now >= v_room.turn_ends_at then
    v_room.active_player := case when v_room.active_player = 1 then 2 else 1 end;
    v_room.phase := 'transition';
    v_room.transition_ends_at := v_now + interval '800 milliseconds';
    v_room.turn_ends_at := v_now + interval '800 milliseconds' + interval '7 minutes';
    v_room.remaining_turn_ms := 420000;
    v_changed := true;
  end if;

  update public.needs_two_rooms
  set player1_connected = v_room.player1_connected,
      player2_connected = v_room.player2_connected,
      player1_last_seen = v_room.player1_last_seen,
      player2_last_seen = v_room.player2_last_seen,
      active_player = v_room.active_player,
      phase = v_room.phase,
      started_at = v_room.started_at,
      turn_ends_at = v_room.turn_ends_at,
      transition_ends_at = v_room.transition_ends_at,
      elapsed_ms = v_room.elapsed_ms,
      remaining_turn_ms = v_room.remaining_turn_ms,
      updated_at = v_now
  where code = v_room.code
  returning * into v_room;

  return jsonb_build_object('state', public.needs_two_public_state(v_room, p_session_id), 'changed', v_changed);
end;
$$;

create or replace function public.needs_two_move_tile(
  p_code text,
  p_session_id uuid,
  p_tile_id integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.needs_two_rooms%rowtype;
  v_player smallint;
  v_position smallint;
  v_solved boolean;
  v_now timestamptz := clock_timestamp();
begin
  select * into v_room from public.needs_two_rooms where code = upper(p_code) for update;

  if not found or (p_session_id <> v_room.player1_id and (v_room.player2_id is null or p_session_id <> v_room.player2_id)) then
    raise exception 'Non fai parte di questa stanza.';
  end if;
  if v_room.phase <> 'playing' or v_room.turn_ends_at is null or v_now >= v_room.turn_ends_at then
    raise exception 'Aspetta un momento.';
  end if;

  v_player := case when p_session_id = v_room.player1_id then 1 else 2 end;
  if v_player <> v_room.active_player then
    raise exception 'Aspetta il tuo turno.';
  end if;
  if p_tile_id is null or p_tile_id < 0 or p_tile_id > 14 then
    raise exception 'Tassello non valido.';
  end if;

  v_position := v_room.board[p_tile_id + 1];
  if abs((v_position / 4) - (v_room.empty_position / 4))
     + abs(mod(v_position, 4) - mod(v_room.empty_position, 4)) <> 1 then
    raise exception 'Questo tassello non puo muoversi.';
  end if;

  v_room.board[p_tile_id + 1] := v_room.empty_position;
  v_room.empty_position := v_position;
  v_room.move_count := v_room.move_count + 1;

  select bool_and(v_room.board[index] = index - 1)
  into v_solved
  from generate_subscripts(v_room.board, 1) index;

  if v_solved then
    v_room.phase := 'completed';
    v_room.completed_at := v_now;
    v_room.turn_ends_at := null;
    v_room.transition_ends_at := null;
    v_room.elapsed_ms := case when v_room.started_at is null then 0 else greatest(0, floor(extract(epoch from (v_now - v_room.started_at)) * 1000)::bigint) end;
  end if;

  update public.needs_two_rooms
  set board = v_room.board,
      empty_position = v_room.empty_position,
      move_count = v_room.move_count,
      phase = v_room.phase,
      completed_at = v_room.completed_at,
      turn_ends_at = v_room.turn_ends_at,
      transition_ends_at = v_room.transition_ends_at,
      elapsed_ms = v_room.elapsed_ms,
      player1_last_seen = case when v_player = 1 then v_now else player1_last_seen end,
      player2_last_seen = case when v_player = 2 then v_now else player2_last_seen end,
      updated_at = v_now
  where code = v_room.code
  returning * into v_room;

  return public.needs_two_public_state(v_room, p_session_id);
end;
$$;

create or replace function public.needs_two_request_rematch(p_code text, p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.needs_two_rooms%rowtype;
  v_board smallint[];
  v_empty smallint;
  v_now timestamptz := clock_timestamp();
begin
  select * into v_room from public.needs_two_rooms where code = upper(p_code) for update;

  if not found or (p_session_id <> v_room.player1_id and (v_room.player2_id is null or p_session_id <> v_room.player2_id)) then
    raise exception 'Non fai parte di questa stanza.';
  end if;

  if v_room.phase <> 'completed' then
    raise exception 'La partita non e ancora completata.';
  end if;

  if p_session_id = v_room.player1_id then
    v_room.player1_rematch := true;
  else
    v_room.player2_rematch := true;
  end if;

  if v_room.player2_id is not null and v_room.player1_rematch and v_room.player2_rematch then
    select shuffled_board, shuffled_empty into v_board, v_empty
    from public.needs_two_shuffle_board();

    update public.needs_two_rooms
    set board = v_board,
        empty_position = v_empty,
        active_player = 1,
        phase = 'starting',
        puzzle_id = public.needs_two_puzzle_id(v_room.puzzle_id),
        move_count = 0,
        started_at = null,
        completed_at = null,
        turn_ends_at = null,
        transition_ends_at = v_now + interval '1 second',
        elapsed_ms = 0,
        remaining_turn_ms = 420000,
        player1_rematch = false,
        player2_rematch = false,
        updated_at = v_now
    where code = v_room.code;
  else
    update public.needs_two_rooms
    set player1_rematch = v_room.player1_rematch,
        player2_rematch = v_room.player2_rematch,
        updated_at = v_now
    where code = v_room.code;
  end if;

  select * into v_room from public.needs_two_rooms where code = v_room.code;
  return public.needs_two_public_state(v_room, p_session_id);
end;
$$;

create or replace function public.needs_two_leave_room(p_code text, p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.needs_two_rooms%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  select * into v_room from public.needs_two_rooms where code = upper(p_code) for update;
  if not found or (p_session_id <> v_room.player1_id and (v_room.player2_id is null or p_session_id <> v_room.player2_id)) then
    return;
  end if;

  if p_session_id = v_room.player1_id then
    v_room.player1_connected := false;
    v_room.player1_last_seen := null;
  else
    v_room.player2_connected := false;
    v_room.player2_last_seen := null;
  end if;

  if v_room.phase in ('starting', 'transition', 'playing') then
    v_room.elapsed_ms := case when v_room.started_at is null then v_room.elapsed_ms else greatest(0, floor(extract(epoch from (v_now - v_room.started_at)) * 1000)::bigint) end;
    v_room.remaining_turn_ms := case when v_room.turn_ends_at is null then 420000 else greatest(0, floor(extract(epoch from (v_room.turn_ends_at - v_now)) * 1000)::bigint) end;
    v_room.phase := 'paused';
    v_room.turn_ends_at := null;
    v_room.transition_ends_at := null;
  end if;

  update public.needs_two_rooms
  set player1_connected = v_room.player1_connected,
      player2_connected = v_room.player2_connected,
      player1_last_seen = v_room.player1_last_seen,
      player2_last_seen = v_room.player2_last_seen,
      phase = v_room.phase,
      turn_ends_at = v_room.turn_ends_at,
      transition_ends_at = v_room.transition_ends_at,
      elapsed_ms = v_room.elapsed_ms,
      remaining_turn_ms = v_room.remaining_turn_ms,
      updated_at = v_now
  where code = v_room.code;
end;
$$;

revoke all on function public.needs_two_random_code() from public, anon, authenticated;
revoke all on function public.needs_two_puzzle_id(text) from public, anon, authenticated;
revoke all on function public.needs_two_shuffle_board() from public, anon, authenticated;
revoke all on function public.needs_two_public_state(public.needs_two_rooms, uuid) from public, anon, authenticated;

revoke all on function public.needs_two_create_room(uuid) from public;
revoke all on function public.needs_two_join_room(text, uuid) from public;
revoke all on function public.needs_two_get_room(text, uuid) from public;
revoke all on function public.needs_two_heartbeat(text, uuid) from public;
revoke all on function public.needs_two_advance_room(text, uuid) from public;
revoke all on function public.needs_two_move_tile(text, uuid, integer) from public;
revoke all on function public.needs_two_request_rematch(text, uuid) from public;
revoke all on function public.needs_two_leave_room(text, uuid) from public;

grant execute on function public.needs_two_create_room(uuid) to anon, authenticated;
grant execute on function public.needs_two_join_room(text, uuid) to anon, authenticated;
grant execute on function public.needs_two_get_room(text, uuid) to anon, authenticated;
grant execute on function public.needs_two_heartbeat(text, uuid) to anon, authenticated;
grant execute on function public.needs_two_advance_room(text, uuid) to anon, authenticated;
grant execute on function public.needs_two_move_tile(text, uuid, integer) to anon, authenticated;
grant execute on function public.needs_two_request_rematch(text, uuid) to anon, authenticated;
grant execute on function public.needs_two_leave_room(text, uuid) to anon, authenticated;

commit;
