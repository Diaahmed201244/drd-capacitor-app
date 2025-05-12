-- Create security_logs table
create table if not exists security_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  fingerprint text,
  ip_address text,
  event_type text not null,
  details jsonb,
  created_at timestamp default now()
);

-- Create indexes
create index if not exists idx_security_logs_user_id on security_logs(user_id);
create index if not exists idx_security_logs_fingerprint on security_logs(fingerprint);
create index if not exists idx_security_logs_ip_address on security_logs(ip_address);
create index if not exists idx_security_logs_event_type on security_logs(event_type);
create index if not exists idx_security_logs_created_at on security_logs(created_at);

-- Enable RLS
alter table security_logs enable row level security;

-- Create policies
create policy "Users can view their own security logs"
  on security_logs for select
  using (auth.uid() = user_id);

create policy "Service role can manage all security logs"
  on security_logs for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- Create function to clean old logs
create or replace function clean_old_security_logs()
returns void as $$
begin
  delete from security_logs
  where created_at < now() - interval '30 days';
end;
$$ language plpgsql;

-- Create scheduled job to clean old logs (runs daily)
select cron.schedule(
  'clean-security-logs',
  '0 0 * * *',  -- Run at midnight every day
  'select clean_old_security_logs()'
); 