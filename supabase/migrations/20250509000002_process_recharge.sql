-- Create necessary enums and tables
DO $$ BEGIN
  -- Transactio  -- Get and validate code
  SELECT * INTO v_code    -- Updat    -- Record the transaction
    INSERT INTO transactions (
      id,
      user_id,
      type,
      amount,
      code_id,
      code,
      balance_after,
      code_count_after,
      created_at
    ) VALUES (
      gen_random_uuid(),
      p_user_id,
      'recharge'::transaction_type,
      p_amount,
      v_treasury_id,
      p_code,
      v_new_balance,
      v_new_code_count,
      NOW()
    ) RETURNING id INTO v_transaction_id;d
    UPDATE user_treasury
    SET status = 'used',
        used_at = NOW(),
        updated_at = NOW()
    WHERE code = p_code AND user_id = p_user_id
    RETURNING id INTO v_treasury_id;rd
  FROM user_treasury
  WHERE code = p_code AND user_id = p_user_id
  FOR UPDATE;  -- Lock the row

  -- Validate code
  IF v_code_record IS NULL THEN
    RAISE EXCEPTION 'Code not found or does not belong to user';
  END IF;

  IF v_code_record.status != 'available' THEN
    RAISE EXCEPTION 'Code is not available for use (status: %)', v_code_record.status;
  END IF;

  IF v_code_record.value != p_amount THEN
    RAISE EXCEPTION 'Code value (%) does not match requested amount (%)', v_code_record.value, p_amount;
  END IF; CREATE TYPE transaction_type AS ENUM ('recharge', 'spend', 'invest', 'refund');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  -- Code status enum
  CREATE TYPE code_status AS ENUM ('available', 'used', 'expired', 'invalid');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create codes table if not exists
CREATE TABLE IF NOT EXISTS user_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  code_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create code treasury table if not exists
CREATE TABLE IF NOT EXISTS user_treasury (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  code VARCHAR(20) NOT NULL,
  status code_status NOT NULL DEFAULT 'available',
  value DECIMAL NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_code UNIQUE (code)
);

-- Create the recharge transaction stored procedure
CREATE OR REPLACE FUNCTION process_recharge(
  p_user_id UUID,
  p_amount DECIMAL,
  p_code VARCHAR(20)
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance DECIMAL;
  v_current_code_count INTEGER;
  v_code_record RECORD;
  v_new_balance DECIMAL;
  v_new_code_count INTEGER;
  v_transaction_id UUID;
  v_treasury_id UUID;
BEGIN
  -- Get current balance and code count
  SELECT balance INTO v_current_balance
  FROM user_balances
  WHERE user_id = p_user_id;

  SELECT code_count INTO v_current_code_count
  FROM user_codes
  WHERE user_id = p_user_id;

  -- Get code status
  SELECT status INTO v_code_status
  FROM user_treasury
  WHERE id = p_code_id AND user_id = p_user_id;

  -- Validate inputs
  IF v_code_status IS NULL THEN
    RAISE EXCEPTION ''Code not found or does not belong to user'';
  END IF;

  IF v_code_status != ''saved'' THEN
    RAISE EXCEPTION ''Code is not available for use (status: %)'', v_code_status;
  END IF;

  -- Calculate new values
  v_new_balance := COALESCE(v_current_balance, 0) + p_amount;
  v_new_code_count := COALESCE(v_current_code_count, 0) - 1;

  -- Begin the transaction block
  BEGIN
    -- Update user balance
    INSERT INTO user_balances (user_id, balance, updated_at)
    VALUES (p_user_id, v_new_balance, NOW())
    ON CONFLICT (user_id) DO UPDATE 
    SET balance = v_new_balance,
        updated_at = NOW();

    -- Update code count
    UPDATE user_codes 
    SET code_count = v_new_code_count,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Update code status to used
    UPDATE user_treasury
    SET status = ''used'',
        updated_at = NOW()
    WHERE id = p_code_id;

    -- Record the transaction
    INSERT INTO transactions (
      id,
      user_id,
      type,
      amount,
      code_id,
      balance_after,
      code_count_after,
      created_at
    ) VALUES (
      gen_random_uuid(),
      p_user_id,
      ''recharge''::transaction_type,
      p_amount,
      p_code_id,
      v_new_balance,
      v_new_code_count,
      NOW()
    ) RETURNING id INTO v_transaction_id;

    -- Return the transaction details
    RETURN jsonb_build_object(
      ''transaction_id'', v_transaction_id,
      ''new_balance'', v_new_balance,
      ''new_code_count'', v_new_code_count
    );

  EXCEPTION
    WHEN OTHERS THEN
      -- Roll back on any error
      RAISE EXCEPTION ''Failed to process recharge: %'', SQLERRM;
  END;
END;
$$;
