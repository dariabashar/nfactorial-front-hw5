create table public.players (
  id text primary key,
  x integer not null,
  y integer not null,
  color text not null,
  name text not null
);

alter table public.players enable row level security;

create policy "Allow public access"
  on public.players
  for all
  using (true)
  with check (true);

-- Enable realtime
alter publication supabase_realtime add table public.players; 