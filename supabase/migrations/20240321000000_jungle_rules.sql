-- Create user_status table if not exists
create table if not exists user_status (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  fingerprint text,
  is_animal boolean default false,
  animal_level text,
  became_animal_at timestamp,
  banned boolean default false,
  ban_reason text,
  banned_at timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Create animal_transfers table
create table if not exists animal_transfers (
  id uuid default gen_random_uuid() primary key,
  from_user uuid references auth.users(id) on delete cascade,
  to_user uuid references auth.users(id) on delete cascade,
  from_fingerprint text,
  to_fingerprint text,
  status text default 'pending',
  rejection_reason text,
  processed_at timestamp,
  created_at timestamp default now()
);

-- Create indexes
create index if not exists idx_user_status_fingerprint on user_status(fingerprint);
create index if not exists idx_user_status_is_animal on user_status(is_animal);
create index if not exists idx_user_status_banned on user_status(banned);
create index if not exists idx_animal_transfers_fingerprints on animal_transfers(from_fingerprint, to_fingerprint);
create index if not exists idx_animal_transfers_status on animal_transfers(status);

-- Create RLS policies
alter table user_status enable row level security;
alter table animal_transfers enable row level security;

-- User status policies
create policy "Users can view their own status"
  on user_status for select
  using (auth.uid() = user_id);

create policy "Only service role can update user status"
  on user_status for update
  using (auth.jwt() ->> 'role' = 'service_role');

-- Animal transfers policies
create policy "Users can view their own transfers"
  on animal_transfers for select
  using (auth.uid() = from_user or auth.uid() = to_user);

create policy "Users can create transfers"
  on animal_transfers for insert
  with check (auth.uid() = from_user);

create policy "Only service role can update transfers"
  on animal_transfers for update
  using (auth.jwt() ->> 'role' = 'service_role');

-- Create function to enforce animal status
create or replace function enforce_animal_status()
returns trigger as $$
begin
  -- Prevent changing is_animal from true to false
  if old.is_animal = true and new.is_animal = false then
    raise exception 'Animal status cannot be reversed';
  end if;
  
  -- Set became_animal_at when becoming an animal
  if old.is_animal = false and new.is_animal = true then
    new.became_animal_at = now();
    new.animal_level = '1';
  end if;
  
  return new;
end;
$$ language plpgsql;

-- Create trigger for animal status enforcement
drop trigger if exists enforce_animal_status_trigger on user_status;
create trigger enforce_animal_status_trigger
  before update on user_status
  for each row
  execute function enforce_animal_status(); 