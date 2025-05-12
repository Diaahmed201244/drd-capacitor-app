-- Create tables for code trading system
CREATE TABLE IF NOT EXISTS codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'unused',
    fingerprint TEXT,
    ip TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS code_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT REFERENCES codes(code),
    from_user UUID REFERENCES auth.users(id),
    to_user UUID REFERENCES auth.users(id),
    from_fingerprint TEXT,
    to_fingerprint TEXT,
    from_ip TEXT,
    to_ip TEXT,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS code_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    code TEXT REFERENCES codes(code),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    resolution_notes TEXT,
    resolved_by TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS judge_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id TEXT REFERENCES codes(code),
    user_id UUID REFERENCES auth.users(id),
    decision BOOLEAN NOT NULL,
    reason TEXT NOT NULL,
    confidence FLOAT NOT NULL,
    gpt_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_codes_user_id ON codes(user_id);
CREATE INDEX IF NOT EXISTS idx_codes_status ON codes(status);
CREATE INDEX IF NOT EXISTS idx_code_trades_code ON code_trades(code);
CREATE INDEX IF NOT EXISTS idx_code_claims_user_id ON code_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_judge_decisions_claim_id ON judge_decisions(claim_id);

-- Enable Row Level Security
ALTER TABLE codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE judge_decisions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own codes"
    ON codes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own trades"
    ON code_trades FOR SELECT
    USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "Users can view their own claims"
    ON code_claims FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own judge decisions"
    ON judge_decisions FOR SELECT
    USING (auth.uid() = user_id); 