-- Create game_logs table
create table if not exists game_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  game_type text not null,
  reward_type text,
  reward_value integer,
  created_at timestamp default now()
);

-- Create indexes
create index if not exists idx_game_logs_user_id on game_logs(user_id);
create index if not exists idx_game_logs_game_type on game_logs(game_type);
create index if not exists idx_game_logs_created_at on game_logs(created_at);

-- Enable RLS
alter table game_logs enable row level security;

-- Create policies
create policy "Users can view their own game logs"
  on game_logs for select
  using (auth.uid() = user_id);

create policy "Service role can manage all game logs"
  on game_logs for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- Create function to clean old logs
create or replace function clean_old_game_logs()
returns void as $$
begin
  delete from game_logs
  where created_at < now() - interval '30 days';
end;
$$ language plpgsql;

-- Create scheduled job to clean old logs (runs daily)
select cron.schedule(
  'clean-game-logs',
  '0 0 * * *',  -- Run at midnight every day
  'select clean_old_game_logs()'
); 