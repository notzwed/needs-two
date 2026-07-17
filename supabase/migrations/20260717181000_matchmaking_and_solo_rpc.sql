begin;

create or replace function public.needs_two_join_matchmaking(p_session_id uuid, p_dark_mode boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_rep integer;
  v_own public.needs_two_matchmaking_queue%rowtype;
  v_candidate public.needs_two_matchmaking_queue%rowtype;
  v_wait numeric;
  v_state jsonb;
  v_code text;
  v_room public.needs_two_rooms%rowtype;
  v_match uuid;
  v_difficulty text;
begin
  if v_user is null then raise exception 'Serve un profilo per trovare un giocatore.'; end if;
  if p_session_id is null then raise exception 'Sessione non valida.'; end if;
  delete from public.needs_two_matchmaking_queue
  where status = 'waiting' and heartbeat_at < clock_timestamp() - interval '12 seconds';

  select * into v_own from public.needs_two_matchmaking_queue where user_id = v_user for update;
  if found and v_own.status = 'matched' then
    return jsonb_build_object('status','matched','matchId',v_own.match_id,'roomCode',v_own.room_code,
      'waitSeconds',greatest(0,floor(extract(epoch from clock_timestamp()-v_own.joined_at))));
  end if;

  select rep into v_rep from public.needs_two_profiles where user_id = v_user;
  if v_rep is null then raise exception 'Profilo non disponibile.'; end if;

  insert into public.needs_two_matchmaking_queue(user_id,session_id,rep,status,joined_at,heartbeat_at,match_id,room_code)
  values(v_user,p_session_id,v_rep,'waiting',clock_timestamp(),clock_timestamp(),null,null)
  on conflict(user_id) do update set session_id=excluded.session_id,rep=excluded.rep,
    heartbeat_at=clock_timestamp(),status='waiting',match_id=null,room_code=null
  returning * into v_own;

  select q.* into v_candidate from public.needs_two_matchmaking_queue q
  where q.status='waiting' and q.user_id<>v_user and q.session_id<>p_session_id
    and q.heartbeat_at>=clock_timestamp()-interval '12 seconds'
    and abs(q.rep-v_rep)<=case
      when greatest(extract(epoch from clock_timestamp()-q.joined_at),extract(epoch from clock_timestamp()-v_own.joined_at))>=35 then 2147483647
      when greatest(extract(epoch from clock_timestamp()-q.joined_at),extract(epoch from clock_timestamp()-v_own.joined_at))>=20 then 400
      else 150 end
  order by q.joined_at limit 1 for update skip locked;

  if not found then
    v_wait:=greatest(0,extract(epoch from clock_timestamp()-v_own.joined_at));
    return jsonb_build_object('status','waiting','waitSeconds',floor(v_wait),
      'range',case when v_wait>=35 then null when v_wait>=20 then 400 else 150 end);
  end if;

  v_state:=public.needs_two_create_room(v_candidate.session_id);
  v_code:=v_state->>'code';
  perform public.needs_two_join_room(v_code,p_session_id);
  select * into v_room from public.needs_two_rooms where code=v_code for update;
  v_difficulty:=case when v_room.board_rows>=8 then 'expert' when v_room.board_rows>=5 then 'hard' else 'normal' end;

  insert into public.needs_two_social_matches(mode,difficulty,room_code,puzzle_id,status,dark_mode,started_at)
  values('random',v_difficulty,v_code,v_room.puzzle_id,'playing',p_dark_mode,clock_timestamp()) returning id into v_match;
  insert into public.needs_two_match_players(match_id,session_id,user_id,player_number) values
    (v_match,v_candidate.session_id,v_candidate.user_id,1),(v_match,p_session_id,v_user,2);
  update public.needs_two_rooms set social_match_id=v_match where code=v_code;
  update public.needs_two_matchmaking_queue set status='matched',heartbeat_at=clock_timestamp(),match_id=v_match,room_code=v_code
    where user_id in(v_user,v_candidate.user_id);
  return jsonb_build_object('status','matched','matchId',v_match,'roomCode',v_code,
    'waitSeconds',floor(extract(epoch from clock_timestamp()-v_own.joined_at)));
end $$;

create or replace function public.needs_two_matchmaking_status(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid(); v_row public.needs_two_matchmaking_queue%rowtype;
begin
  if v_user is null then raise exception 'Serve un profilo per trovare un giocatore.'; end if;
  select * into v_row from public.needs_two_matchmaking_queue where user_id=v_user and session_id=p_session_id;
  if not found then return jsonb_build_object('status','idle'); end if;
  if v_row.status='waiting' and v_row.heartbeat_at<clock_timestamp()-interval '12 seconds' then
    delete from public.needs_two_matchmaking_queue where user_id=v_user;
    return jsonb_build_object('status','idle');
  end if;
  return jsonb_build_object('status',v_row.status,'matchId',v_row.match_id,'roomCode',v_row.room_code,
    'waitSeconds',greatest(0,floor(extract(epoch from clock_timestamp()-v_row.joined_at))),
    'range',case when clock_timestamp()-v_row.joined_at>=interval '35 seconds' then null
      when clock_timestamp()-v_row.joined_at>=interval '20 seconds' then 400 else 150 end);
end $$;

create or replace function public.needs_two_leave_matchmaking(p_session_id uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.needs_two_matchmaking_queue where user_id=auth.uid() and session_id=p_session_id and status='waiting'
$$;

create or replace function public.needs_two_shuffle_solo(p_size integer)
returns table(shuffled_board smallint[],shuffled_empty smallint)
language plpgsql volatile set search_path = '' as $$
declare
  v_total integer:=p_size*p_size; v_previous smallint; v_candidates smallint[]; v_chosen smallint;
  v_tile_index integer; v_displaced integer; v_steps integer:=case p_size when 3 then 100 when 4 then 180 when 5 then 260 else 360 end;
  v_attempt integer:=0;
begin
  if p_size<3 or p_size>6 then raise exception 'Difficolta non valida.'; end if;
  loop
    v_attempt:=v_attempt+1;
    shuffled_board:=array(select generate_series(0,v_total-2)::smallint);
    shuffled_empty:=(v_total-1)::smallint; v_previous:=-1;
    for v_step in 1..v_steps loop
      select array_agg(position::smallint) into v_candidates from generate_series(0,v_total-1) position
      where abs((position/p_size)-(shuffled_empty/p_size))+abs(mod(position,p_size)-mod(shuffled_empty,p_size))=1
        and position<>v_previous;
      v_chosen:=v_candidates[1+floor(random()*cardinality(v_candidates))::integer];
      v_tile_index:=array_position(shuffled_board,v_chosen);
      v_previous:=shuffled_empty; shuffled_board[v_tile_index]:=shuffled_empty; shuffled_empty:=v_chosen;
    end loop;
    select count(*) into v_displaced from generate_subscripts(shuffled_board,1) i where shuffled_board[i]<>i-1;
    exit when v_displaced>=least(v_total-2,p_size*2) or v_attempt>=12;
  end loop;
  return next;
end $$;

grant execute on function public.needs_two_join_matchmaking(uuid,boolean) to authenticated;
grant execute on function public.needs_two_matchmaking_status(uuid) to authenticated;
grant execute on function public.needs_two_leave_matchmaking(uuid) to authenticated;
revoke all on function public.needs_two_shuffle_solo(integer) from public,anon,authenticated;
commit;

begin;
create or replace function public.needs_two_solo_state(p_game public.needs_two_solo_games,p_session_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  return jsonb_build_object(
    'id',p_game.id,'matchId',p_game.match_id,'difficulty',p_game.difficulty,'puzzleId',p_game.puzzle_id,
    'boardSize',p_game.board_size,
    'tiles',(select jsonb_agg(jsonb_build_object('tileId',i-1,'correctPosition',i-1,'currentPosition',p_game.board[i]) order by i)
      from generate_subscripts(p_game.board,1) i),
    'emptyPosition',p_game.empty_position,'moveCount',p_game.move_count,'phase',p_game.status,
    'completionReason',p_game.completion_reason,
    'elapsedMs',least(600000,greatest(0,floor(extract(epoch from (
      case when p_game.status='paused' then coalesce(p_game.paused_at,clock_timestamp())
        else coalesce(p_game.completed_at,clock_timestamp()) end-p_game.started_at))*1000)::bigint-p_game.accumulated_pause_ms)),
    'serverTime',floor(extract(epoch from clock_timestamp())*1000)::bigint,'isOwner',p_game.session_id=p_session_id);
end
$$;

create or replace function public.needs_two_start_solo(
  p_session_id uuid,p_difficulty text,p_puzzle_id text default null,p_dark_mode boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid:=auth.uid(); v_config public.needs_two_difficulties%rowtype; v_board smallint[]; v_empty smallint;
  v_puzzle text; v_match uuid; v_game public.needs_two_solo_games%rowtype;
begin
  if p_session_id is null then raise exception 'Sessione non valida.'; end if;
  select * into v_config from public.needs_two_difficulties where key=lower(p_difficulty);
  if not found then raise exception 'Difficolta non valida.'; end if;
  v_puzzle:=coalesce(nullif(lower(trim(p_puzzle_id)),''),public.needs_two_puzzle_id());
  if v_puzzle!~'^[a-z0-9-]{2,48}$' then raise exception 'Immagine non valida.'; end if;
  select shuffled_board,shuffled_empty into v_board,v_empty from public.needs_two_shuffle_solo(v_config.board_size);
  insert into public.needs_two_social_matches(mode,difficulty,puzzle_id,status,dark_mode,started_at)
    values('solo',v_config.key,v_puzzle,'playing',p_dark_mode,clock_timestamp()) returning id into v_match;
  insert into public.needs_two_match_players(match_id,session_id,user_id,player_number)
    values(v_match,p_session_id,v_user,1);
  insert into public.needs_two_solo_games(match_id,user_id,session_id,difficulty,puzzle_id,board_size,board,empty_position)
    values(v_match,v_user,p_session_id,v_config.key,v_puzzle,v_config.board_size,v_board,v_empty) returning * into v_game;
  return public.needs_two_solo_state(v_game,p_session_id);
end $$;

create or replace function public.needs_two_get_solo(p_game_id uuid,p_session_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_game public.needs_two_solo_games%rowtype; v_elapsed bigint;
begin
  select * into v_game from public.needs_two_solo_games where id=p_game_id and session_id=p_session_id;
  if not found then raise exception 'Partita Solo non disponibile.'; end if;
  if v_game.status='playing' then
    v_elapsed:=floor(extract(epoch from clock_timestamp()-v_game.started_at)*1000)::bigint-v_game.accumulated_pause_ms;
    if v_elapsed>=600000 then
      update public.needs_two_solo_games set status='completed',completion_reason='timeout',elapsed_ms=600000,
        completed_at=clock_timestamp() where id=v_game.id returning * into v_game;
      update public.needs_two_social_matches set status='completed',completion_reason='timeout',elapsed_ms=600000,
        move_count=v_game.move_count,completed_at=clock_timestamp() where id=v_game.match_id;
      perform public.needs_two_finalize_match_id(v_game.match_id);
    end if;
  end if;
  return public.needs_two_solo_state(v_game,p_session_id);
end $$;

create or replace function public.needs_two_move_solo(p_game_id uuid,p_session_id uuid,p_tile_id integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_game public.needs_two_solo_games%rowtype; v_position smallint; v_solved boolean; v_elapsed bigint;
begin
  select * into v_game from public.needs_two_solo_games where id=p_game_id and session_id=p_session_id for update;
  if not found then raise exception 'Partita Solo non disponibile.'; end if;
  if v_game.status<>'playing' then raise exception 'La partita non e attiva.'; end if;
  v_elapsed:=floor(extract(epoch from clock_timestamp()-v_game.started_at)*1000)::bigint-v_game.accumulated_pause_ms;
  if v_elapsed>=600000 then
    update public.needs_two_solo_games set status='completed',completion_reason='timeout',elapsed_ms=600000,
      completed_at=clock_timestamp() where id=v_game.id returning * into v_game;
    update public.needs_two_social_matches set status='completed',completion_reason='timeout',elapsed_ms=600000,
      move_count=v_game.move_count,completed_at=clock_timestamp() where id=v_game.match_id;
    perform public.needs_two_finalize_match_id(v_game.match_id);
    return public.needs_two_solo_state(v_game,p_session_id);
  end if;
  if p_tile_id<0 or p_tile_id>=v_game.board_size*v_game.board_size-1 then raise exception 'Tassello non valido.'; end if;
  v_position:=v_game.board[p_tile_id+1];
  if abs((v_position/v_game.board_size)-(v_game.empty_position/v_game.board_size))
    +abs(mod(v_position,v_game.board_size)-mod(v_game.empty_position,v_game.board_size))<>1 then
    raise exception 'Questo tassello non puo muoversi.';
  end if;
  v_game.board[p_tile_id+1]:=v_game.empty_position; v_game.empty_position:=v_position;
  v_game.move_count:=v_game.move_count+1;
  select bool_and(v_game.board[i]=i-1) into v_solved from generate_subscripts(v_game.board,1) i;
  if v_solved and v_game.empty_position=v_game.board_size*v_game.board_size-1 then
    v_game.status:='completed'; v_game.completion_reason:='solved'; v_game.elapsed_ms:=least(600000,v_elapsed);
    v_game.completed_at:=clock_timestamp();
  end if;
  update public.needs_two_solo_games set board=v_game.board,empty_position=v_game.empty_position,
    move_count=v_game.move_count,status=v_game.status,completion_reason=v_game.completion_reason,
    elapsed_ms=v_game.elapsed_ms,completed_at=v_game.completed_at where id=v_game.id returning * into v_game;
  update public.needs_two_match_players set move_count=v_game.move_count where match_id=v_game.match_id and session_id=p_session_id;
  if v_solved then
    update public.needs_two_social_matches set status='completed',completion_reason='solved',elapsed_ms=v_game.elapsed_ms,
      move_count=v_game.move_count,completed_at=v_game.completed_at where id=v_game.match_id;
    perform public.needs_two_finalize_match_id(v_game.match_id);
  end if;
  return public.needs_two_solo_state(v_game,p_session_id);
end $$;

create or replace function public.needs_two_pause_solo(p_game_id uuid,p_session_id uuid,p_pause boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_game public.needs_two_solo_games%rowtype;
begin
  select * into v_game from public.needs_two_solo_games where id=p_game_id and session_id=p_session_id for update;
  if not found or v_game.status in('completed','cancelled') then raise exception 'Partita Solo non disponibile.'; end if;
  if p_pause and v_game.status='playing' then
    update public.needs_two_solo_games set status='paused',paused_at=clock_timestamp() where id=v_game.id returning * into v_game;
  elsif not p_pause and v_game.status='paused' then
    update public.needs_two_solo_games set status='playing',
      accumulated_pause_ms=accumulated_pause_ms+floor(extract(epoch from clock_timestamp()-paused_at)*1000)::bigint,
      paused_at=null where id=v_game.id returning * into v_game;
  end if;
  return public.needs_two_solo_state(v_game,p_session_id);
end $$;

create or replace function public.needs_two_cancel_solo(p_game_id uuid,p_session_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_game public.needs_two_solo_games%rowtype;
begin
  update public.needs_two_solo_games set status='cancelled',completion_reason='cancelled',completed_at=clock_timestamp()
    where id=p_game_id and session_id=p_session_id and status in('playing','paused') returning * into v_game;
  if found then update public.needs_two_social_matches set status='cancelled',completion_reason='cancelled',
    completed_at=clock_timestamp() where id=v_game.match_id; end if;
end $$;

create or replace function public.needs_two_solo_reward(p_game_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('matchId',m.id,'earned',coalesce(rh.amount,0),'totalRep',p.rep,
    'breakdown',coalesce(rh.breakdown,'{}'::jsonb),'level',public.needs_two_profile_level(p.rep))
  from public.needs_two_solo_games g join public.needs_two_social_matches m on m.id=g.match_id
  join public.needs_two_profiles p on p.user_id=auth.uid()
  left join public.needs_two_rep_history rh on rh.user_id=p.user_id and rh.match_id=m.id
  where g.id=p_game_id and g.user_id=auth.uid()
$$;

grant execute on function public.needs_two_start_solo(uuid,text,text,boolean) to anon,authenticated;
grant execute on function public.needs_two_get_solo(uuid,uuid) to anon,authenticated;
grant execute on function public.needs_two_move_solo(uuid,uuid,integer) to anon,authenticated;
grant execute on function public.needs_two_pause_solo(uuid,uuid,boolean) to anon,authenticated;
grant execute on function public.needs_two_cancel_solo(uuid,uuid) to anon,authenticated;
grant execute on function public.needs_two_solo_reward(uuid) to authenticated;
revoke all on function public.needs_two_solo_state(public.needs_two_solo_games,uuid) from public,anon,authenticated;
commit;
