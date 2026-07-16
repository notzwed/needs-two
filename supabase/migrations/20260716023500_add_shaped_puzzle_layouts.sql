begin;

delete from public.needs_two_rooms;

alter table public.needs_two_rooms
  drop constraint if exists needs_two_board_length,
  drop constraint if exists needs_two_rooms_empty_position_check,
  add column if not exists layout text not null default 'square4',
  add column if not exists board_rows smallint not null default 4,
  add column if not exists board_columns smallint not null default 4;

alter table public.needs_two_rooms
  add constraint needs_two_layout_check
    check (layout in ('square4', 'square8', 'rectangle', 'pentagon', 'hexagon')),
  add constraint needs_two_board_shape_check
    check (
      cardinality(board) = case layout
        when 'square8' then 63
        when 'rectangle' then 19
        when 'hexagon' then 18
        else 15
      end
      and empty_position >= 0
      and empty_position < cardinality(board) + 1
    );

create or replace function public.needs_two_layout_for(p_puzzle_id text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_puzzle_id like 'square8-%' then 'square8'
    when p_puzzle_id like 'rect-%' then 'rectangle'
    when p_puzzle_id like 'pent-%' then 'pentagon'
    when p_puzzle_id like 'hex-%' then 'hexagon'
    else 'square4'
  end;
$$;

create or replace function public.needs_two_cell_count(p_layout text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_layout
    when 'square8' then 64
    when 'rectangle' then 20
    when 'hexagon' then 19
    else 16
  end;
$$;

create or replace function public.needs_two_are_adjacent(
  p_layout text,
  p_first integer,
  p_second integer
)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_columns integer;
  v_q integer[] := array[0,1,2,-1,0,1,2,-2,-1,0,1,2,-2,-1,0,1,-2,-1,0];
  v_r integer[] := array[-2,-2,-2,-1,-1,-1,-1,0,0,0,0,0,1,1,1,1,2,2,2];
  v_dq integer;
  v_dr integer;
begin
  if p_layout = 'hexagon' then
    if p_first < 0 or p_second < 0 or p_first >= 19 or p_second >= 19 then
      return false;
    end if;
    v_dq := v_q[p_first + 1] - v_q[p_second + 1];
    v_dr := v_r[p_first + 1] - v_r[p_second + 1];
    return abs(v_dq) + abs(v_dr) + abs(v_dq + v_dr) = 2;
  end if;

  v_columns := case p_layout when 'square8' then 8 when 'rectangle' then 5 else 4 end;
  return abs((p_first / v_columns) - (p_second / v_columns))
    + abs(mod(p_first, v_columns) - mod(p_second, v_columns)) = 1;
end;
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
    'rainbow-valley', 'little-bakery', 'treehouse', 'sailboat-bay',
    'square8-01', 'square8-02', 'square8-03', 'square8-04', 'square8-05',
    'square8-06', 'square8-07', 'square8-08', 'square8-09', 'square8-10',
    'rect-01', 'rect-02', 'rect-03', 'rect-04', 'rect-05',
    'rect-06', 'rect-07', 'rect-08', 'rect-09', 'rect-10',
    'pent-01', 'pent-02', 'pent-03', 'pent-04', 'pent-05',
    'pent-06', 'pent-07', 'pent-08', 'pent-09', 'pent-10',
    'hex-01', 'hex-02', 'hex-03', 'hex-04', 'hex-05',
    'hex-06', 'hex-07', 'hex-08', 'hex-09', 'hex-10'
  ]::text[]) puzzle
  where p_previous is null or puzzle <> p_previous
  order by random()
  limit 1;
$$;

create or replace function public.needs_two_shuffle_board(p_layout text)
returns table(shuffled_board smallint[], shuffled_empty smallint)
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_count integer := public.needs_two_cell_count(p_layout);
  v_previous_empty smallint;
  v_candidates smallint[];
  v_chosen smallint;
  v_tile_index integer;
  v_displaced integer;
  v_steps integer := case when p_layout = 'square8' then 1100 else greatest(220, v_count * 15) end;
  v_threshold integer := least(v_count - 2, greatest(8, floor(v_count * 0.45)::integer));
  v_attempt integer := 0;
begin
  loop
    v_attempt := v_attempt + 1;
    shuffled_board := array(select generate_series(0, v_count - 2)::smallint);
    shuffled_empty := (v_count - 1)::smallint;
    v_previous_empty := -1;

    for v_step in 1..v_steps loop
      select array_agg(position::smallint)
      into v_candidates
      from generate_series(0, v_count - 1) position
      where public.needs_two_are_adjacent(p_layout, position, shuffled_empty)
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

    exit when v_displaced >= v_threshold or v_attempt >= 12;
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
      'size', p_room.board_columns,
      'layout', p_room.layout,
      'rows', p_room.board_rows,
      'columns', p_room.board_columns,
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
      'gameEndsAt', case when p_room.game_ends_at is null then null else floor(extract(epoch from p_room.game_ends_at) * 1000)::bigint end,
      'turnEndsAt', case when p_room.turn_ends_at is null then null else floor(extract(epoch from p_room.turn_ends_at) * 1000)::bigint end,
      'transitionEndsAt', case when p_room.transition_ends_at is null then null else floor(extract(epoch from p_room.transition_ends_at) * 1000)::bigint end,
      'completionReason', p_room.completion_reason,
      'elapsedMs', case
        when p_room.phase in ('paused', 'completed') then p_room.elapsed_ms
        when p_room.started_at is null then 0
        else greatest(0, least(420000, floor(extract(epoch from (clock_timestamp() - p_room.started_at)) * 1000)::bigint))
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
  v_puzzle text := public.needs_two_puzzle_id();
  v_layout text;
  v_rows smallint;
  v_columns smallint;
  v_room public.needs_two_rooms%rowtype;
begin
  delete from public.needs_two_rooms
  where updated_at < clock_timestamp() - interval '24 hours';

  v_layout := public.needs_two_layout_for(v_puzzle);
  v_rows := case v_layout when 'square8' then 8 when 'hexagon' then 5 else 4 end;
  v_columns := case v_layout when 'square8' then 8 when 'rectangle' then 5 when 'hexagon' then 5 else 4 end;

  select shuffled_board, shuffled_empty into v_board, v_empty
  from public.needs_two_shuffle_board(v_layout);

  loop
    v_code := public.needs_two_random_code();
    exit when not exists (select 1 from public.needs_two_rooms where code = v_code);
  end loop;

  insert into public.needs_two_rooms (
    code, player1_id, board, empty_position, puzzle_id, layout, board_rows, board_columns
  ) values (
    v_code, p_session_id, v_board, v_empty, v_puzzle, v_layout, v_rows, v_columns
  )
  returning * into v_room;

  return public.needs_two_public_state(v_room, p_session_id);
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
  if v_room.game_ends_at is null or v_now >= v_room.game_ends_at then
    raise exception 'Tempo scaduto.';
  end if;

  v_player := case when p_session_id = v_room.player1_id then 1 else 2 end;
  if v_player <> v_room.active_player then
    raise exception 'Aspetta il tuo turno.';
  end if;
  if p_tile_id is null or p_tile_id < 0 or p_tile_id >= cardinality(v_room.board) then
    raise exception 'Tassello non valido.';
  end if;

  v_position := v_room.board[p_tile_id + 1];
  if not public.needs_two_are_adjacent(v_room.layout, v_position, v_room.empty_position) then
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
    v_room.game_ends_at := null;
    v_room.turn_ends_at := null;
    v_room.transition_ends_at := null;
    v_room.completion_reason := 'solved';
    v_room.elapsed_ms := case
      when v_room.started_at is null then 0
      else greatest(0, least(420000, floor(extract(epoch from (v_now - v_room.started_at)) * 1000)::bigint))
    end;
  end if;

  update public.needs_two_rooms
  set board = v_room.board,
      empty_position = v_room.empty_position,
      move_count = v_room.move_count,
      phase = v_room.phase,
      completed_at = v_room.completed_at,
      game_ends_at = v_room.game_ends_at,
      turn_ends_at = v_room.turn_ends_at,
      transition_ends_at = v_room.transition_ends_at,
      completion_reason = v_room.completion_reason,
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
  v_puzzle text;
  v_layout text;
  v_rows smallint;
  v_columns smallint;
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
    v_puzzle := public.needs_two_puzzle_id(v_room.puzzle_id);
    v_layout := public.needs_two_layout_for(v_puzzle);
    v_rows := case v_layout when 'square8' then 8 when 'hexagon' then 5 else 4 end;
    v_columns := case v_layout when 'square8' then 8 when 'rectangle' then 5 when 'hexagon' then 5 else 4 end;

    select shuffled_board, shuffled_empty into v_board, v_empty
    from public.needs_two_shuffle_board(v_layout);

    update public.needs_two_rooms
    set board = v_board,
        empty_position = v_empty,
        active_player = 1,
        phase = 'starting',
        puzzle_id = v_puzzle,
        layout = v_layout,
        board_rows = v_rows,
        board_columns = v_columns,
        move_count = 0,
        started_at = null,
        completed_at = null,
        game_ends_at = null,
        turn_ends_at = null,
        transition_ends_at = v_now + interval '1 second',
        completion_reason = null,
        elapsed_ms = 0,
        remaining_turn_ms = 7000,
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

revoke all on function public.needs_two_layout_for(text) from public, anon, authenticated;
revoke all on function public.needs_two_cell_count(text) from public, anon, authenticated;
revoke all on function public.needs_two_are_adjacent(text, integer, integer) from public, anon, authenticated;
revoke all on function public.needs_two_shuffle_board(text) from public, anon, authenticated;

commit;
