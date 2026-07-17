begin;

create extension if not exists pgcrypto;

create table if not exists public.needs_two_levels (
  key text primary key,
  label text not null,
  min_rep integer not null unique check (min_rep >= 0),
  sort_order smallint not null unique
);

insert into public.needs_two_levels (key, label, min_rep, sort_order) values
  ('beginner', 'Beginner', 0, 1),
  ('solver', 'Solver', 100, 2),
  ('partner', 'Partner', 300, 3),
  ('linker', 'Linker', 700, 4),
  ('master-pair', 'Master Pair', 1500, 5),
  ('twofold', 'Twofold', 3000, 6)
on conflict (key) do update set label = excluded.label, min_rep = excluded.min_rep, sort_order = excluded.sort_order;

create table if not exists public.needs_two_avatars (
  key text primary key,
  label text not null,
  image_path text not null,
  sort_order smallint not null unique
);

insert into public.needs_two_avatars (key, label, image_path, sort_order) values
  ('cozy-cat', 'Cozy Cat', 'puzzles/cozy-cat.png', 1),
  ('red-panda', 'Red Panda', 'puzzles/red-panda.png', 2),
  ('garden-bunny', 'Garden Bunny', 'puzzles/garden-bunny.png', 3),
  ('sleepy-fox', 'Sleepy Fox', 'puzzles/sleepy-fox.png', 4),
  ('happy-corgi', 'Happy Corgi', 'puzzles/happy-corgi.png', 5),
  ('pond-frog', 'Pond Frog', 'puzzles/pond-frog.png', 6),
  ('penguin-pair', 'Penguin Pair', 'puzzles/penguin-pair.png', 7),
  ('ocean-whale', 'Ocean Whale', 'puzzles/ocean-whale.png', 8),
  ('sea-turtle', 'Sea Turtle', 'puzzles/sea-turtle.png', 9),
  ('hedgehog', 'Hedgehog Picnic', 'puzzles/hedgehog-picnic.png', 10),
  ('river-otters', 'River Otters', 'puzzles/river-otters.png', 11),
  ('koi-garden', 'Koi Garden', 'puzzles/koi-garden.png', 12)
on conflict (key) do update set label = excluded.label, image_path = excluded.image_path, sort_order = excluded.sort_order;

create table if not exists public.needs_two_difficulties (
  key text primary key,
  label text not null,
  board_size smallint not null check (board_size between 3 and 8),
  base_rep integer not null check (base_rep >= 0),
  very_fast_ms integer not null,
  fast_ms integer not null,
  average_ms integer not null,
  sort_order smallint not null unique
);

insert into public.needs_two_difficulties
  (key, label, board_size, base_rep, very_fast_ms, fast_ms, average_ms, sort_order)
values
  ('easy', 'Easy', 3, 10, 45000, 75000, 120000, 1),
  ('normal', 'Normal', 4, 18, 90000, 150000, 240000, 2),
  ('hard', 'Hard', 5, 28, 180000, 300000, 420000, 3),
  ('expert', 'Expert', 6, 40, 270000, 420000, 600000, 4)
on conflict (key) do update set
  label = excluded.label,
  board_size = excluded.board_size,
  base_rep = excluded.base_rep,
  very_fast_ms = excluded.very_fast_ms,
  fast_ms = excluded.fast_ms,
  average_ms = excluded.average_ms,
  sort_order = excluded.sort_order;

create table if not exists public.needs_two_badges (
  key text primary key,
  name text not null,
  description text not null,
  requirement text not null,
  target integer not null check (target > 0),
  sort_order smallint not null unique,
  palette text not null default 'sage'
);

insert into public.needs_two_badges
  (key, name, description, requirement, target, sort_order, palette)
values
  ('first-piece', 'First Piece', 'Your first completed puzzle.', 'Complete 1 puzzle', 1, 1, 'sage'),
  ('perfect-pair', 'Perfect Pair', 'A steady rhythm with friends.', 'Complete 10 friend co-op puzzles', 10, 2, 'coral'),
  ('speedy-solver', 'Speedy Solver', 'A puzzle finished ahead of the clock.', 'Finish a puzzle under its fast threshold', 1, 3, 'yellow'),
  ('random-friend', 'Random Friend', 'New partners, shared solutions.', 'Complete 5 Random Pairing games', 5, 4, 'blue'),
  ('solo-mind', 'Solo Mind', 'Quiet focus and careful moves.', 'Complete 10 Solo puzzles', 10, 5, 'lilac'),
  ('hundred-club', 'Hundred Club', 'Your first REP milestone.', 'Reach 100 REP', 100, 6, 'peach'),
  ('thousand-club', 'Thousand Club', 'A long trail of solved pictures.', 'Reach 1,000 REP', 1000, 7, 'night'),
  ('no-mistakes', 'No Mistakes', 'A particularly tidy solution.', 'Complete with few extra moves', 1, 8, 'cream'),
  ('night-solver', 'Night Solver', 'A calm puzzle after sunset.', 'Complete a puzzle in night mode', 1, 9, 'night'),
  ('comeback', 'Comeback', 'You kept going when time was tight.', 'Complete after two low-time turns', 2, 10, 'coral'),
  ('loyal-partner', 'Loyal Partner', 'A familiar partner makes a strong pair.', 'Complete 5 games with the same friend', 5, 11, 'blue'),
  ('puzzle-master', 'Puzzle Master', 'Every difficulty has been conquered.', 'Complete every difficulty', 4, 12, 'yellow')
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  requirement = excluded.requirement,
  target = excluded.target,
  sort_order = excluded.sort_order,
  palette = excluded.palette;

create table if not exists public.needs_two_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  avatar_key text not null default 'cozy-cat' references public.needs_two_avatars(key),
  avatar_url text,
  nickname_color text not null default 'sage',
  nickname_font text not null default 'nunito',
  rep integer not null default 0 check (rep >= 0),
  featured_badge text references public.needs_two_badges(key),
  displayed_badges text[] not null default '{}'::text[] check (cardinality(displayed_badges) <= 3),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create unique index if not exists needs_two_profiles_nickname_unique
  on public.needs_two_profiles (lower(nickname));

create table if not exists public.needs_two_player_stats (
  user_id uuid primary key references public.needs_two_profiles(user_id) on delete cascade,
  games_played integer not null default 0,
  games_completed integer not null default 0,
  puzzles_completed integer not null default 0,
  solo_completed integer not null default 0,
  friend_completed integer not null default 0,
  random_completed integer not null default 0,
  victories integer not null default 0,
  losses integer not null default 0,
  total_play_ms bigint not null default 0,
  best_time_ms bigint,
  total_moves bigint not null default 0,
  abandons integer not null default 0,
  completion_streak integer not null default 0,
  best_completion_streak integer not null default 0,
  rep_earned integer not null default 0,
  updated_at timestamptz not null default clock_timestamp()
);

create table if not exists public.needs_two_social_matches (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('solo', 'friend', 'random')),
  difficulty text not null references public.needs_two_difficulties(key),
  room_code text,
  puzzle_id text not null,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'completed', 'cancelled')),
  completion_reason text check (completion_reason in ('solved', 'timeout', 'cancelled')),
  elapsed_ms bigint not null default 0 check (elapsed_ms >= 0),
  move_count integer not null default 0 check (move_count >= 0),
  dark_mode boolean not null default false,
  rep_finalized boolean not null default false,
  started_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  created_at timestamptz not null default clock_timestamp()
);

create index if not exists needs_two_social_matches_room_idx
  on public.needs_two_social_matches (room_code, created_at desc);

create table if not exists public.needs_two_match_players (
  match_id uuid not null references public.needs_two_social_matches(id) on delete cascade,
  session_id uuid not null,
  user_id uuid references public.needs_two_profiles(user_id) on delete set null,
  player_number smallint not null check (player_number in (1, 2)),
  move_count integer not null default 0,
  abandoned boolean not null default false,
  stats_applied boolean not null default false,
  joined_at timestamptz not null default clock_timestamp(),
  primary key (match_id, session_id)
);

create unique index if not exists needs_two_match_players_user_unique
  on public.needs_two_match_players (match_id, user_id)
  where user_id is not null;

create table if not exists public.needs_two_rep_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.needs_two_profiles(user_id) on delete cascade,
  match_id uuid not null references public.needs_two_social_matches(id) on delete cascade,
  amount integer not null,
  breakdown jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  unique (user_id, match_id)
);

create index if not exists needs_two_rep_history_user_idx
  on public.needs_two_rep_history (user_id, created_at desc);

create table if not exists public.needs_two_user_badges (
  user_id uuid not null references public.needs_two_profiles(user_id) on delete cascade,
  badge_key text not null references public.needs_two_badges(key) on delete cascade,
  unlocked_at timestamptz not null default clock_timestamp(),
  match_id uuid references public.needs_two_social_matches(id) on delete set null,
  primary key (user_id, badge_key)
);

create table if not exists public.needs_two_matchmaking_queue (
  user_id uuid primary key references public.needs_two_profiles(user_id) on delete cascade,
  session_id uuid not null,
  rep integer not null,
  status text not null default 'waiting' check (status in ('waiting', 'matched')),
  joined_at timestamptz not null default clock_timestamp(),
  heartbeat_at timestamptz not null default clock_timestamp(),
  match_id uuid references public.needs_two_social_matches(id) on delete set null,
  room_code text
);

create index if not exists needs_two_matchmaking_waiting_idx
  on public.needs_two_matchmaking_queue (status, joined_at)
  where status = 'waiting';

create table if not exists public.needs_two_solo_games (
  id uuid primary key default gen_random_uuid(),
  match_id uuid unique references public.needs_two_social_matches(id) on delete cascade,
  user_id uuid references public.needs_two_profiles(user_id) on delete set null,
  session_id uuid not null,
  difficulty text not null references public.needs_two_difficulties(key),
  puzzle_id text not null,
  board_size smallint not null check (board_size between 3 and 6),
  board smallint[] not null,
  empty_position smallint not null,
  move_count integer not null default 0,
  status text not null default 'playing' check (status in ('playing', 'paused', 'completed', 'cancelled')),
  completion_reason text check (completion_reason in ('solved', 'timeout', 'cancelled')),
  started_at timestamptz not null default clock_timestamp(),
  paused_at timestamptz,
  accumulated_pause_ms bigint not null default 0,
  elapsed_ms bigint not null default 0,
  completed_at timestamptz,
  expires_at timestamptz not null default clock_timestamp() + interval '24 hours'
);

alter table public.needs_two_rooms
  add column if not exists social_match_id uuid references public.needs_two_social_matches(id) on delete set null,
  add column if not exists player1_moves integer not null default 0,
  add column if not exists player2_moves integer not null default 0,
  add column if not exists player1_low_time_turns integer not null default 0,
  add column if not exists player2_low_time_turns integer not null default 0;

create or replace function public.needs_two_clean_nickname(p_nickname text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_value text := trim(regexp_replace(coalesce(p_nickname, ''), '\s+', ' ', 'g'));
  v_lower text;
  v_blocked text[] := array['fuck', 'shit', 'bitch', 'cazzo', 'merda', 'stronzo', 'nazist'];
  v_word text;
begin
  if char_length(v_value) < 3 or char_length(v_value) > 16 then
    raise exception 'Il nickname deve avere tra 3 e 16 caratteri.';
  end if;
  if v_value ~ '[[:cntrl:]<>/\\]' or v_value !~ '[[:alnum:]]' then
    raise exception 'Scegli un nickname semplice, senza simboli speciali.';
  end if;
  v_lower := lower(v_value);
  foreach v_word in array v_blocked loop
    if position(v_word in v_lower) > 0 then
      raise exception 'Questo nickname non e disponibile.';
    end if;
  end loop;
  return v_value;
end;
$$;

create or replace function public.needs_two_profile_level(p_rep integer)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with current_level as (
    select *
    from public.needs_two_levels
    where min_rep <= greatest(0, p_rep)
    order by min_rep desc
    limit 1
  ),
  next_level as (
    select *
    from public.needs_two_levels
    where min_rep > greatest(0, p_rep)
    order by min_rep
    limit 1
  )
  select jsonb_build_object(
    'key', current_level.key,
    'label', current_level.label,
    'minRep', current_level.min_rep,
    'nextRep', next_level.min_rep,
    'progress', case
      when next_level.min_rep is null then 100
      else floor(100.0 * (greatest(0, p_rep) - current_level.min_rep)
        / greatest(1, next_level.min_rep - current_level.min_rep))
    end
  )
  from current_level
  left join next_level on true;
$$;

create or replace function public.needs_two_create_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nickname text;
  v_avatar text;
  v_color text;
  v_font text;
begin
  v_nickname := public.needs_two_clean_nickname(
    coalesce(new.raw_user_meta_data ->> 'nickname', 'Player ' || left(new.id::text, 6))
  );
  v_avatar := coalesce(new.raw_user_meta_data ->> 'avatar_key', 'cozy-cat');
  v_color := coalesce(new.raw_user_meta_data ->> 'nickname_color', 'sage');
  v_font := coalesce(new.raw_user_meta_data ->> 'nickname_font', 'nunito');

  if not exists (select 1 from public.needs_two_avatars where key = v_avatar) then
    v_avatar := 'cozy-cat';
  end if;
  if v_color not in ('sage', 'coral', 'powder-blue', 'warm-yellow', 'soft-lilac', 'peach', 'soft-night', 'deep-cream') then
    v_color := 'sage';
  end if;
  if v_font not in ('nunito', 'quicksand', 'dm-sans', 'fredoka', 'baloo-2', 'manrope') then
    v_font := 'nunito';
  end if;

  insert into public.needs_two_profiles
    (user_id, nickname, avatar_key, nickname_color, nickname_font)
  values
    (new.id, v_nickname, v_avatar, v_color, v_font);

  insert into public.needs_two_player_stats (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists needs_two_auth_profile on auth.users;
create trigger needs_two_auth_profile
  after insert on auth.users
  for each row execute function public.needs_two_create_profile();

create or replace function public.needs_two_track_room_move()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_delta integer;
begin
  v_delta := greatest(0, new.move_count - old.move_count);
  if v_delta > 0 then
    if old.active_player = 1 then
      new.player1_moves := old.player1_moves + v_delta;
    else
      new.player2_moves := old.player2_moves + v_delta;
    end if;
  end if;
  if new.move_count = 0 and old.move_count > 0 then
    new.player1_moves := 0;
    new.player2_moves := 0;
    new.player1_low_time_turns := 0;
    new.player2_low_time_turns := 0;
    new.social_match_id := null;
  end if;
  return new;
end;
$$;

drop trigger if exists needs_two_room_move_tracking on public.needs_two_rooms;
create trigger needs_two_room_move_tracking
  before update of move_count on public.needs_two_rooms
  for each row execute function public.needs_two_track_room_move();

commit;

begin;

create or replace function public.needs_two_badge_progress(p_user_id uuid, p_badge_key text)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_stats public.needs_two_player_stats%rowtype;
  v_rep integer;
  v_progress integer := 0;
begin
  select * into v_stats from public.needs_two_player_stats where user_id = p_user_id;
  select rep into v_rep from public.needs_two_profiles where user_id = p_user_id;

  v_progress := case p_badge_key
    when 'first-piece' then v_stats.puzzles_completed
    when 'perfect-pair' then v_stats.friend_completed
    when 'random-friend' then v_stats.random_completed
    when 'solo-mind' then v_stats.solo_completed
    when 'hundred-club' then v_rep
    when 'thousand-club' then v_rep
    when 'speedy-solver' then (
      select count(*)::integer
      from public.needs_two_match_players mp
      join public.needs_two_social_matches m on m.id = mp.match_id
      join public.needs_two_difficulties d on d.key = m.difficulty
      where mp.user_id = p_user_id and m.completion_reason = 'solved'
        and m.elapsed_ms <= d.fast_ms
    )
    when 'no-mistakes' then (
      select count(*)::integer
      from public.needs_two_match_players mp
      join public.needs_two_social_matches m on m.id = mp.match_id
      join public.needs_two_difficulties d on d.key = m.difficulty
      where mp.user_id = p_user_id and m.completion_reason = 'solved'
        and m.move_count <= d.board_size * d.board_size * 12
    )
    when 'night-solver' then (
      select count(*)::integer
      from public.needs_two_match_players mp
      join public.needs_two_social_matches m on m.id = mp.match_id
      where mp.user_id = p_user_id and m.completion_reason = 'solved' and m.dark_mode
    )
    when 'comeback' then (
      select coalesce(max(case mp.player_number
        when 1 then r.player1_low_time_turns
        else r.player2_low_time_turns
      end), 0)::integer
      from public.needs_two_match_players mp
      join public.needs_two_social_matches m on m.id = mp.match_id
      left join public.needs_two_rooms r on r.code = m.room_code
      where mp.user_id = p_user_id and m.completion_reason = 'solved'
    )
    when 'loyal-partner' then (
      select coalesce(max(pair_count), 0)::integer
      from (
        select count(*) pair_count
        from public.needs_two_match_players mine
        join public.needs_two_match_players partner
          on partner.match_id = mine.match_id and partner.user_id is not null and partner.user_id <> mine.user_id
        join public.needs_two_social_matches m on m.id = mine.match_id
        where mine.user_id = p_user_id and m.completion_reason = 'solved'
        group by partner.user_id
      ) pairs
    )
    when 'puzzle-master' then (
      select count(distinct m.difficulty)::integer
      from public.needs_two_match_players mp
      join public.needs_two_social_matches m on m.id = mp.match_id
      where mp.user_id = p_user_id and m.completion_reason = 'solved'
    )
    else 0
  end;

  return greatest(0, coalesce(v_progress, 0));
end;
$$;

create or replace function public.needs_two_unlock_badges(p_user_id uuid, p_match_id uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_badge public.needs_two_badges%rowtype;
  v_unlocked text[] := '{}'::text[];
begin
  for v_badge in select * from public.needs_two_badges order by sort_order loop
    if public.needs_two_badge_progress(p_user_id, v_badge.key) >= v_badge.target then
      insert into public.needs_two_user_badges (user_id, badge_key, match_id)
      values (p_user_id, v_badge.key, p_match_id)
      on conflict (user_id, badge_key) do nothing;

      if found then
        v_unlocked := array_append(v_unlocked, v_badge.key);
      end if;
    end if;
  end loop;
  return v_unlocked;
end;
$$;

create or replace function public.needs_two_profile_json(p_user_id uuid, p_include_private boolean default false)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.user_id,
    'nickname', p.nickname,
    'avatarKey', p.avatar_key,
    'avatarUrl', p.avatar_url,
    'nicknameColor', p.nickname_color,
    'nicknameFont', p.nickname_font,
    'rep', p.rep,
    'level', public.needs_two_profile_level(p.rep),
    'featuredBadge', p.featured_badge,
    'displayedBadges', p.displayed_badges,
    'createdAt', floor(extract(epoch from p.created_at) * 1000)::bigint,
    'stats', jsonb_build_object(
      'gamesPlayed', s.games_played,
      'gamesCompleted', s.games_completed,
      'puzzlesCompleted', s.puzzles_completed,
      'soloCompleted', s.solo_completed,
      'friendCompleted', s.friend_completed,
      'randomCompleted', s.random_completed,
      'victories', s.victories,
      'losses', s.losses,
      'totalPlayMs', s.total_play_ms,
      'bestTimeMs', s.best_time_ms,
      'averageTimeMs', case when s.games_completed = 0 then null else floor(s.total_play_ms / s.games_completed) end,
      'totalMoves', s.total_moves,
      'averageMoves', case when s.games_completed = 0 then 0 else round(s.total_moves::numeric / s.games_completed, 1) end,
      'abandons', s.abandons,
      'completionStreak', s.completion_streak,
      'bestCompletionStreak', s.best_completion_streak,
      'repEarned', s.rep_earned,
      'completionPercent', case when s.games_played = 0 then 0 else round(100.0 * s.games_completed / s.games_played, 1) end
    ),
    'badges', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'key', b.key,
        'name', b.name,
        'description', b.description,
        'requirement', b.requirement,
        'target', b.target,
        'sortOrder', b.sort_order,
        'palette', b.palette,
        'unlockedAt', case when ub.unlocked_at is null then null else floor(extract(epoch from ub.unlocked_at) * 1000)::bigint end,
        'progress', least(b.target, public.needs_two_badge_progress(p.user_id, b.key))
      ) order by b.sort_order), '[]'::jsonb)
      from public.needs_two_badges b
      left join public.needs_two_user_badges ub on ub.badge_key = b.key and ub.user_id = p.user_id
    ),
    'recentMatches', case when p_include_private then (
      select coalesce(jsonb_agg(match_row order by match_row ->> 'completedAt' desc), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'id', m.id,
          'mode', m.mode,
          'difficulty', m.difficulty,
          'puzzleId', m.puzzle_id,
          'completed', m.completion_reason = 'solved',
          'elapsedMs', m.elapsed_ms,
          'moves', m.move_count,
          'completedAt', case when m.completed_at is null then null else floor(extract(epoch from m.completed_at) * 1000)::bigint end,
          'rep', coalesce(rh.amount, 0)
        ) match_row
        from public.needs_two_match_players mp
        join public.needs_two_social_matches m on m.id = mp.match_id
        left join public.needs_two_rep_history rh on rh.match_id = m.id and rh.user_id = p.user_id
        where mp.user_id = p.user_id and m.status in ('completed', 'cancelled')
        order by m.completed_at desc nulls last
        limit 8
      ) recent
    ) else '[]'::jsonb end
  )
  from public.needs_two_profiles p
  join public.needs_two_player_stats s on s.user_id = p.user_id
  where p.user_id = p_user_id;
$$;

create or replace function public.needs_two_get_my_profile()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return null;
  end if;
  return public.needs_two_profile_json(auth.uid(), true);
end;
$$;

create or replace function public.needs_two_get_public_profile(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.needs_two_profile_json(p_user_id, false);
$$;

create or replace function public.needs_two_nickname_available(p_nickname text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_clean text;
begin
  begin
    v_clean := public.needs_two_clean_nickname(p_nickname);
  exception when others then
    return false;
  end;
  return not exists (
    select 1 from public.needs_two_profiles
    where lower(nickname) = lower(v_clean)
      and (auth.uid() is null or user_id <> auth.uid())
  );
end;
$$;

create or replace function public.needs_two_update_profile(
  p_nickname text,
  p_avatar_key text,
  p_avatar_url text,
  p_nickname_color text,
  p_nickname_font text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_nickname text;
begin
  if v_user is null then
    raise exception 'Devi accedere per aggiornare il profilo.';
  end if;

  v_nickname := public.needs_two_clean_nickname(p_nickname);

  if exists (
    select 1 from public.needs_two_profiles
    where lower(nickname) = lower(v_nickname) and user_id <> v_user
  ) then
    raise exception 'Questo nickname e gia in uso.';
  end if;
  if not exists (select 1 from public.needs_two_avatars where key = p_avatar_key) then
    raise exception 'Avatar non valido.';
  end if;
  if p_nickname_color not in ('sage', 'coral', 'powder-blue', 'warm-yellow', 'soft-lilac', 'peach', 'soft-night', 'deep-cream') then
    raise exception 'Colore nickname non valido.';
  end if;
  if p_nickname_font not in ('nunito', 'quicksand', 'dm-sans', 'fredoka', 'baloo-2', 'manrope') then
    raise exception 'Font nickname non valido.';
  end if;
  if p_avatar_url is not null and (
    char_length(p_avatar_url) > 500
    or position('/storage/v1/object/public/needs-two-avatars/' in p_avatar_url) = 0
  ) then
    raise exception 'Immagine profilo non valida.';
  end if;

  update public.needs_two_profiles
  set nickname = v_nickname,
      avatar_key = p_avatar_key,
      avatar_url = nullif(p_avatar_url, ''),
      nickname_color = p_nickname_color,
      nickname_font = p_nickname_font,
      updated_at = clock_timestamp()
  where user_id = v_user;

  return public.needs_two_profile_json(v_user, true);
end;
$$;

create or replace function public.needs_two_set_featured_badges(
  p_displayed text[],
  p_featured text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_key text;
begin
  if v_user is null then
    raise exception 'Devi accedere per scegliere le medaglie.';
  end if;
  if cardinality(coalesce(p_displayed, '{}'::text[])) > 3 then
    raise exception 'Puoi mostrare al massimo 3 medaglie.';
  end if;
  foreach v_key in array coalesce(p_displayed, '{}'::text[]) loop
    if not exists (
      select 1 from public.needs_two_user_badges
      where user_id = v_user and badge_key = v_key
    ) then
      raise exception 'Puoi mostrare solo medaglie sbloccate.';
    end if;
  end loop;
  if p_featured is not null and not exists (
    select 1 from public.needs_two_user_badges
    where user_id = v_user and badge_key = p_featured
  ) then
    raise exception 'La medaglia principale deve essere sbloccata.';
  end if;

  update public.needs_two_profiles
  set displayed_badges = coalesce(p_displayed, '{}'::text[]),
      featured_badge = p_featured,
      updated_at = clock_timestamp()
  where user_id = v_user;

  return public.needs_two_profile_json(v_user, true);
end;
$$;

alter table public.needs_two_levels enable row level security;
alter table public.needs_two_avatars enable row level security;
alter table public.needs_two_difficulties enable row level security;
alter table public.needs_two_badges enable row level security;
alter table public.needs_two_profiles enable row level security;
alter table public.needs_two_player_stats enable row level security;
alter table public.needs_two_user_badges enable row level security;
alter table public.needs_two_rep_history enable row level security;
alter table public.needs_two_social_matches enable row level security;
alter table public.needs_two_match_players enable row level security;
alter table public.needs_two_matchmaking_queue enable row level security;
alter table public.needs_two_solo_games enable row level security;

drop policy if exists "social config is public" on public.needs_two_levels;
create policy "social config is public" on public.needs_two_levels for select using (true);
drop policy if exists "avatars are public" on public.needs_two_avatars;
create policy "avatars are public" on public.needs_two_avatars for select using (true);
drop policy if exists "difficulties are public" on public.needs_two_difficulties;
create policy "difficulties are public" on public.needs_two_difficulties for select using (true);
drop policy if exists "badges are public" on public.needs_two_badges;
create policy "badges are public" on public.needs_two_badges for select using (true);
drop policy if exists "profiles are public" on public.needs_two_profiles;
create policy "profiles are public" on public.needs_two_profiles for select using (true);
drop policy if exists "stats are public" on public.needs_two_player_stats;
create policy "stats are public" on public.needs_two_player_stats for select using (true);
drop policy if exists "earned badges are public" on public.needs_two_user_badges;
create policy "earned badges are public" on public.needs_two_user_badges for select using (true);
drop policy if exists "own rep history" on public.needs_two_rep_history;
create policy "own rep history" on public.needs_two_rep_history for select using (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'needs-two-avatars',
  'needs-two-avatars',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

drop policy if exists "avatar uploads own folder" on storage.objects;
create policy "avatar uploads own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'needs-two-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatar updates own folder" on storage.objects;
create policy "avatar updates own folder"
on storage.objects for update to authenticated
using (
  bucket_id = 'needs-two-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'needs-two-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatar deletes own folder" on storage.objects;
create policy "avatar deletes own folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'needs-two-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

revoke all on function public.needs_two_clean_nickname(text) from public;
grant execute on function public.needs_two_nickname_available(text) to anon, authenticated;
grant execute on function public.needs_two_get_my_profile() to authenticated;
grant execute on function public.needs_two_get_public_profile(uuid) to anon, authenticated;
grant execute on function public.needs_two_update_profile(text, text, text, text, text) to authenticated;
grant execute on function public.needs_two_set_featured_badges(text[], text) to authenticated;

commit;
begin;

alter table public.needs_two_rooms
  add column if not exists player1_low_turn_marker timestamptz,
  add column if not exists player2_low_turn_marker timestamptz;

create or replace function public.needs_two_track_room_move()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_delta integer;
  v_now timestamptz := clock_timestamp();
begin
  v_delta := greatest(0, new.move_count - old.move_count);
  if v_delta > 0 then
    if old.active_player = 1 then
      new.player1_moves := old.player1_moves + v_delta;
      if old.turn_ends_at is not null
        and old.turn_ends_at - v_now <= interval '2 seconds'
        and old.turn_ends_at is distinct from old.player1_low_turn_marker then
        new.player1_low_time_turns := old.player1_low_time_turns + 1;
        new.player1_low_turn_marker := old.turn_ends_at;
      end if;
    else
      new.player2_moves := old.player2_moves + v_delta;
      if old.turn_ends_at is not null
        and old.turn_ends_at - v_now <= interval '2 seconds'
        and old.turn_ends_at is distinct from old.player2_low_turn_marker then
        new.player2_low_time_turns := old.player2_low_time_turns + 1;
        new.player2_low_turn_marker := old.turn_ends_at;
      end if;
    end if;
  end if;
  if new.move_count = 0 and old.move_count > 0 then
    new.player1_moves := 0;
    new.player2_moves := 0;
    new.player1_low_time_turns := 0;
    new.player2_low_time_turns := 0;
    new.player1_low_turn_marker := null;
    new.player2_low_turn_marker := null;
    new.social_match_id := null;
  end if;
  return new;
end;
$$;

create or replace function public.needs_two_register_room_match(
  p_code text,
  p_session_id uuid,
  p_mode text default 'friend',
  p_dark_mode boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.needs_two_rooms%rowtype;
  v_match public.needs_two_social_matches%rowtype;
  v_user uuid := auth.uid();
  v_player smallint;
  v_difficulty text;
begin
  if p_mode not in ('friend', 'random') then
    raise exception 'Modalita partita non valida.';
  end if;

  select * into v_room
  from public.needs_two_rooms
  where code = upper(p_code)
  for update;

  if not found or (
    p_session_id <> v_room.player1_id
    and (v_room.player2_id is null or p_session_id <> v_room.player2_id)
  ) then
    raise exception 'Non fai parte di questa stanza.';
  end if;

  v_player := case when p_session_id = v_room.player1_id then 1 else 2 end;
  v_difficulty := case v_room.layout
    when 'square8' then 'expert'
    when 'rectangle' then 'hard'
    else 'normal'
  end;

  if v_room.social_match_id is not null then
    select * into v_match
    from public.needs_two_social_matches
    where id = v_room.social_match_id and not rep_finalized;
  end if;

  if v_match.id is null then
    insert into public.needs_two_social_matches (
      mode, difficulty, room_code, puzzle_id, status, dark_mode
    ) values (
      p_mode, v_difficulty, v_room.code, v_room.puzzle_id,
      case when v_room.phase in ('playing', 'transition') then 'playing' else 'waiting' end,
      p_dark_mode
    )
    returning * into v_match;

    update public.needs_two_rooms
    set social_match_id = v_match.id
    where code = v_room.code;
  else
    update public.needs_two_social_matches
    set dark_mode = dark_mode or p_dark_mode,
        status = case when v_room.phase in ('playing', 'transition') then 'playing' else status end
    where id = v_match.id;
  end if;

  insert into public.needs_two_match_players (
    match_id, session_id, user_id, player_number
  ) values (
    v_match.id, p_session_id, v_user, v_player
  )
  on conflict (match_id, session_id) do update set
    user_id = coalesce(excluded.user_id, public.needs_two_match_players.user_id),
    player_number = excluded.player_number;

  return v_match.id;
end;
$$;

create or replace function public.needs_two_match_intro(
  p_code text,
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.needs_two_rooms%rowtype;
  v_match_id uuid;
begin
  select * into v_room from public.needs_two_rooms where code = upper(p_code);
  if not found or (
    p_session_id <> v_room.player1_id
    and (v_room.player2_id is null or p_session_id <> v_room.player2_id)
  ) then
    raise exception 'Non fai parte di questa stanza.';
  end if;

  v_match_id := v_room.social_match_id;
  if v_match_id is null then
    v_match_id := public.needs_two_register_room_match(v_room.code, p_session_id, 'friend', false);
  end if;

  return jsonb_build_object(
    'matchId', v_match_id,
    'mode', (select mode from public.needs_two_social_matches where id = v_match_id),
    'players', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'playerNumber', numbers.number,
        'isCurrent', numbers.session_id = p_session_id,
        'profile', case when mp.user_id is null then jsonb_build_object(
          'id', null,
          'nickname', 'Guest ' || numbers.number,
          'avatarKey', case numbers.number when 1 then 'mascot-blue' else 'mascot-red' end,
          'avatarUrl', null,
          'nicknameColor', case numbers.number when 1 then 'powder-blue' else 'coral' end,
          'nicknameFont', 'nunito',
          'rep', 0,
          'level', public.needs_two_profile_level(0),
          'featuredBadge', null,
          'displayedBadges', '[]'::jsonb,
          'createdAt', null,
          'stats', jsonb_build_object('gamesPlayed', 0, 'puzzlesCompleted', 0),
          'badges', '[]'::jsonb,
          'recentMatches', '[]'::jsonb
        ) else public.needs_two_profile_json(mp.user_id, false) end
      ) order by numbers.number), '[]'::jsonb)
      from (
        values
          (1::smallint, v_room.player1_id),
          (2::smallint, v_room.player2_id)
      ) numbers(number, session_id)
      left join public.needs_two_match_players mp
        on mp.match_id = v_match_id and mp.player_number = numbers.number
      where numbers.session_id is not null
    )
  );
end;
$$;

create or replace function public.needs_two_finalize_match_id(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.needs_two_social_matches%rowtype;
  v_room public.needs_two_rooms%rowtype;
  v_solo public.needs_two_solo_games%rowtype;
  v_player public.needs_two_match_players%rowtype;
  v_difficulty public.needs_two_difficulties%rowtype;
  v_base integer;
  v_speed_percent integer;
  v_speed_bonus integer;
  v_collaboration_bonus integer;
  v_multiplier numeric;
  v_farm_multiplier numeric;
  v_amount integer;
  v_partner_moves integer;
  v_total_moves integer;
  v_share numeric;
  v_recent_same integer;
  v_inserted uuid;
  v_unlocked text[];
  v_breakdown jsonb;
  v_solved boolean;
begin
  select * into v_match
  from public.needs_two_social_matches
  where id = p_match_id
  for update;

  if not found or v_match.rep_finalized then
    return;
  end if;

  if v_match.mode = 'solo' then
    select * into v_solo
    from public.needs_two_solo_games
    where match_id = v_match.id;

    if not found or v_solo.status not in ('completed', 'cancelled') then
      raise exception 'La partita Solo non e ancora terminata.';
    end if;

    v_match.status := case when v_solo.status = 'completed' then 'completed' else 'cancelled' end;
    v_match.completion_reason := coalesce(
      v_solo.completion_reason,
      case when v_solo.status = 'completed' then 'solved' else 'cancelled' end
    );
    v_match.elapsed_ms := v_solo.elapsed_ms;
    v_match.move_count := v_solo.move_count;
    v_match.completed_at := coalesce(v_solo.completed_at, clock_timestamp());
  else
    select * into v_room
    from public.needs_two_rooms
    where code = v_match.room_code;

    if not found or v_room.phase <> 'completed' then
      raise exception 'La partita multiplayer non e ancora terminata.';
    end if;

    v_match.status := 'completed';
    v_match.completion_reason := coalesce(v_room.completion_reason, 'timeout');
    v_match.elapsed_ms := v_room.elapsed_ms;
    v_match.move_count := v_room.move_count;
    v_match.completed_at := coalesce(v_room.completed_at, clock_timestamp());

    update public.needs_two_match_players
    set move_count = case player_number
      when 1 then v_room.player1_moves
      else v_room.player2_moves
    end
    where match_id = v_match.id;
  end if;

  update public.needs_two_social_matches
  set status = v_match.status,
      completion_reason = v_match.completion_reason,
      elapsed_ms = v_match.elapsed_ms,
      move_count = v_match.move_count,
      completed_at = v_match.completed_at
  where id = v_match.id;

  v_solved := v_match.completion_reason = 'solved';
  select * into v_difficulty
  from public.needs_two_difficulties
  where key = v_match.difficulty;

  for v_player in
    select * from public.needs_two_match_players
    where match_id = v_match.id and user_id is not null
    for update
  loop
    if not v_player.stats_applied then
      v_inserted := null;
      insert into public.needs_two_player_stats (user_id)
      values (v_player.user_id)
      on conflict (user_id) do nothing;

      update public.needs_two_player_stats
      set games_played = games_played + 1,
          games_completed = games_completed + case when v_solved then 1 else 0 end,
          puzzles_completed = puzzles_completed + case when v_solved then 1 else 0 end,
          solo_completed = solo_completed + case when v_solved and v_match.mode = 'solo' then 1 else 0 end,
          friend_completed = friend_completed + case when v_solved and v_match.mode = 'friend' then 1 else 0 end,
          random_completed = random_completed + case when v_solved and v_match.mode = 'random' then 1 else 0 end,
          victories = victories + case when v_solved then 1 else 0 end,
          losses = losses + case when not v_solved then 1 else 0 end,
          total_play_ms = total_play_ms + v_match.elapsed_ms,
          best_time_ms = case
            when not v_solved then best_time_ms
            when best_time_ms is null then v_match.elapsed_ms
            else least(best_time_ms, v_match.elapsed_ms)
          end,
          total_moves = total_moves + v_player.move_count,
          abandons = abandons + case when v_player.abandoned then 1 else 0 end,
          completion_streak = case when v_solved then completion_streak + 1 else 0 end,
          best_completion_streak = greatest(best_completion_streak, case when v_solved then completion_streak + 1 else 0 end),
          updated_at = clock_timestamp()
      where user_id = v_player.user_id;

      if v_solved and not v_player.abandoned then
        v_base := v_difficulty.base_rep;
        v_speed_percent := case
          when v_match.elapsed_ms <= v_difficulty.very_fast_ms then 30
          when v_match.elapsed_ms <= v_difficulty.fast_ms then 20
          when v_match.elapsed_ms <= v_difficulty.average_ms then 10
          else 0
        end;
        v_speed_bonus := round(v_base * v_speed_percent / 100.0);
        v_collaboration_bonus := 0;

        if v_match.mode in ('friend', 'random') then
          select coalesce(sum(move_count), 0) into v_total_moves
          from public.needs_two_match_players where match_id = v_match.id;
          select coalesce(sum(move_count), 0) into v_partner_moves
          from public.needs_two_match_players
          where match_id = v_match.id and session_id <> v_player.session_id;
          v_share := case when v_total_moves = 0 then 0 else v_player.move_count::numeric / v_total_moves end;
          if v_player.move_count > 0 and v_partner_moves > 0 and v_share >= 0.15 then
            v_collaboration_bonus := greatest(1, round(v_base * 0.10));
          end if;
        end if;

        v_multiplier := case v_match.mode
          when 'solo' then 0.8
          when 'random' then 1.15
          else 1.0
        end;

        select count(*) into v_recent_same
        from public.needs_two_rep_history rh
        join public.needs_two_social_matches previous_match on previous_match.id = rh.match_id
        where rh.user_id = v_player.user_id
          and previous_match.puzzle_id = v_match.puzzle_id
          and rh.created_at >= clock_timestamp() - interval '24 hours';

        v_farm_multiplier := case when v_recent_same >= 3 then 0.25 else 1.0 end;
        v_amount := greatest(1, round(
          (v_base + v_speed_bonus + v_collaboration_bonus)
          * v_multiplier * v_farm_multiplier
        ));

        v_breakdown := jsonb_build_object(
          'base', v_base,
          'speedBonus', v_speed_bonus,
          'speedPercent', v_speed_percent,
          'collaborationBonus', v_collaboration_bonus,
          'modeMultiplier', v_multiplier,
          'farmMultiplier', v_farm_multiplier,
          'total', v_amount
        );

        insert into public.needs_two_rep_history (user_id, match_id, amount, breakdown)
        values (v_player.user_id, v_match.id, v_amount, v_breakdown)
        on conflict (user_id, match_id) do nothing
        returning id into v_inserted;

        if v_inserted is not null then
          update public.needs_two_profiles
          set rep = rep + v_amount, updated_at = clock_timestamp()
          where user_id = v_player.user_id;

          update public.needs_two_player_stats
          set rep_earned = rep_earned + v_amount
          where user_id = v_player.user_id;
        end if;
      end if;

      v_unlocked := public.needs_two_unlock_badges(v_player.user_id, v_match.id);
      if v_inserted is not null then
        update public.needs_two_rep_history
        set breakdown = breakdown || jsonb_build_object('badgesUnlocked', to_jsonb(v_unlocked))
        where id = v_inserted;
      end if;

      update public.needs_two_match_players
      set stats_applied = true
      where match_id = v_match.id and session_id = v_player.session_id;
    end if;
  end loop;

  update public.needs_two_social_matches
  set rep_finalized = true
  where id = v_match.id;
end;
$$;

create or replace function public.needs_two_finalize_room_match(
  p_code text,
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.needs_two_rooms%rowtype;
begin
  select * into v_room from public.needs_two_rooms where code = upper(p_code);
  if not found or (
    p_session_id <> v_room.player1_id
    and (v_room.player2_id is null or p_session_id <> v_room.player2_id)
  ) then
    raise exception 'Non fai parte di questa stanza.';
  end if;

  if v_room.social_match_id is null then
    perform public.needs_two_register_room_match(v_room.code, p_session_id, 'friend', false);
    select * into v_room from public.needs_two_rooms where code = upper(p_code);
  end if;

  perform public.needs_two_finalize_match_id(v_room.social_match_id);
  return jsonb_build_object('matchId', v_room.social_match_id, 'finalized', true);
end;
$$;

create or replace function public.needs_two_match_rewards(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_match_id uuid;
begin
  if v_user is null then
    return null;
  end if;

  select m.id into v_match_id
  from public.needs_two_social_matches m
  join public.needs_two_match_players mp on mp.match_id = m.id
  where m.room_code = upper(p_code) and mp.user_id = v_user
  order by m.created_at desc
  limit 1;

  if v_match_id is null then
    return null;
  end if;

  return (
    select jsonb_build_object(
      'matchId', v_match_id,
      'earned', coalesce(rh.amount, 0),
      'totalRep', p.rep,
      'breakdown', coalesce(rh.breakdown, '{}'::jsonb),
      'level', public.needs_two_profile_level(p.rep)
    )
    from public.needs_two_profiles p
    left join public.needs_two_rep_history rh
      on rh.user_id = p.user_id and rh.match_id = v_match_id
    where p.user_id = v_user
  );
end;
$$;

grant execute on function public.needs_two_register_room_match(text, uuid, text, boolean) to anon, authenticated;
grant execute on function public.needs_two_match_intro(text, uuid) to anon, authenticated;
grant execute on function public.needs_two_finalize_room_match(text, uuid) to anon, authenticated;
grant execute on function public.needs_two_match_rewards(text) to authenticated;
revoke all on function public.needs_two_finalize_match_id(uuid) from public, anon, authenticated;
revoke all on function public.needs_two_unlock_badges(uuid, uuid) from public, anon, authenticated;
revoke all on function public.needs_two_badge_progress(uuid, text) from public, anon, authenticated;

commit;
