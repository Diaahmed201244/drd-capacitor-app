-- Create user_fingerprints table
CREATE TABLE IF NOT EXISTS user_fingerprints (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  fingerprint TEXT NOT NULL,
  ip TEXT,
  country TEXT,
  isp TEXT,
  is_vpn BOOLEAN DEFAULT false,
  region_locked_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE(fingerprint)
);

-- Create security_logs table
CREATE TABLE IF NOT EXISTS security_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  fingerprint TEXT,
  event_type TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_fingerprints_user_id ON user_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type); 