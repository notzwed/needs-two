begin;

delete from public.needs_two_rooms
where layout in ('pentagon', 'hexagon');

alter table public.needs_two_rooms
  drop constraint if exists needs_two_layout_check,
  drop constraint if exists needs_two_board_shape_check;

alter table public.needs_two_rooms
  add constraint needs_two_layout_check
    check (layout in ('square4', 'square8', 'rectangle')),
  add constraint needs_two_board_shape_check
    check (
      cardinality(board) = case layout
        when 'square8' then 63
        when 'rectangle' then 19
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
    else 16
  end;
$$;

create or replace function public.needs_two_are_adjacent(
  p_layout text,
  p_first integer,
  p_second integer
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select abs((p_first / case p_layout when 'square8' then 8 when 'rectangle' then 5 else 4 end)
    - (p_second / case p_layout when 'square8' then 8 when 'rectangle' then 5 else 4 end))
    + abs(mod(p_first, case p_layout when 'square8' then 8 when 'rectangle' then 5 else 4 end)
    - mod(p_second, case p_layout when 'square8' then 8 when 'rectangle' then 5 else 4 end)) = 1;
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
    'rect-06', 'rect-07', 'rect-08', 'rect-09', 'rect-10'
  ]::text[]) puzzle
  where p_previous is null or puzzle <> p_previous
  order by random()
  limit 1;
$$;

revoke all on function public.needs_two_layout_for(text) from public, anon, authenticated;
revoke all on function public.needs_two_cell_count(text) from public, anon, authenticated;
revoke all on function public.needs_two_are_adjacent(text, integer, integer) from public, anon, authenticated;

commit;