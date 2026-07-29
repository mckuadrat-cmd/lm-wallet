-- Create sequence for transaction numbering
CREATE SEQUENCE IF NOT EXISTS transaction_number_seq START 1;

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    email TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'banker')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER update_profiles_modtime
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 2. app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY CHECK (id = '00000000-0000-0000-0000-000000000000'::uuid),
    app_name TEXT NOT NULL,
    activity_name TEXT NOT NULL,
    currency_name TEXT DEFAULT 'Leadership Money',
    currency_code TEXT DEFAULT 'LM',
    logo_url TEXT,
    participant_message TEXT,
    banker_can_cancel BOOLEAN DEFAULT true,
    facilitator_pin TEXT DEFAULT '123456',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER update_app_settings_modtime
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 3. classes table
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    initial_balance BIGINT DEFAULT 0 CHECK (initial_balance >= 0),
    current_balance BIGINT DEFAULT 0 CHECK (current_balance >= 0),
    public_token TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER update_classes_modtime
    BEFORE UPDATE ON public.classes
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 4. class_cards table
CREATE TABLE IF NOT EXISTS public.class_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    rfid_uid TEXT UNIQUE,
    qr_token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'lost')),
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER update_class_cards_modtime
    BEFORE UPDATE ON public.class_cards
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 5. missions table
CREATE TABLE IF NOT EXISTS public.missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    reward_amount BIGINT NOT NULL CHECK (reward_amount >= 0),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER update_missions_modtime
    BEFORE UPDATE ON public.missions
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 6. items table
CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('purchase', 'rental')),
    price BIGINT NOT NULL CHECK (price >= 0),
    unit TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER update_items_modtime
    BEFORE UPDATE ON public.items
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 7. transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_number TEXT UNIQUE NOT NULL,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
    direction TEXT NOT NULL CHECK (direction IN ('income', 'expense')),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('initial_balance', 'mission_reward', 'job_reward', 'purchase', 'rental', 'bonus', 'penalty', 'adjustment_add', 'adjustment_subtract', 'refund', 'other_income', 'other_expense')),
    amount BIGINT NOT NULL CHECK (amount >= 0),
    description TEXT,
    mission_id UUID REFERENCES public.missions(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
    balance_before BIGINT NOT NULL,
    balance_after BIGINT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    cancellation_reason TEXT,
    edited_at TIMESTAMPTZ,
    edited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    edit_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 8. transaction_items table
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    item_type TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL,
    unit_price BIGINT NOT NULL CHECK (unit_price >= 0),
    subtotal BIGINT NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. balance_adjustments table
CREATE TABLE IF NOT EXISTS public.balance_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    old_balance BIGINT NOT NULL,
    new_balance BIGINT NOT NULL,
    difference BIGINT NOT NULL,
    reason TEXT NOT NULL,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-profile trigger on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, email, role, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'banker'),
    true,
    now(),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Supabase RPC: create_lm_transaction
CREATE OR REPLACE FUNCTION public.create_lm_transaction(
  p_class_id UUID,
  p_direction TEXT,
  p_transaction_type TEXT,
  p_amount BIGINT,
  p_mission_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_items JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_class_active BOOLEAN;
  v_current_balance BIGINT;
  v_balance_after BIGINT;
  v_tx_id UUID;
  v_tx_number TEXT;
  v_item RECORD;
  v_result JSONB;
BEGIN
  -- 1. Check user authentication and role
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;
  IF v_user_role NOT IN ('admin', 'banker') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- 2. Check active class and lock class row
  SELECT is_active, current_balance INTO v_class_active, v_current_balance
  FROM public.classes WHERE id = p_class_id FOR UPDATE;
  
  IF v_class_active IS NULL THEN
    RAISE EXCEPTION 'Class not found';
  END IF;
  
  IF NOT v_class_active THEN
    RAISE EXCEPTION 'Class is not active';
  END IF;

  -- 3. Check amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  -- 4. Calculate new balance
  IF p_direction = 'income' THEN
    v_balance_after := v_current_balance + p_amount;
  ELSIF p_direction = 'expense' THEN
    v_balance_after := v_current_balance - p_amount;
    IF v_balance_after < 0 THEN
      RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %', v_current_balance, p_amount;
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid direction: %', p_direction;
  END IF;

  -- 5. Generate transaction number
  v_tx_number := 'TX-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.transaction_number_seq')::text, 4, '0');

  -- 6. Insert transaction
  v_tx_id := gen_random_uuid();
  INSERT INTO public.transactions (
    id, transaction_number, class_id, direction, transaction_type, amount,
    description, mission_id, status, balance_before, balance_after, created_by, created_at
  ) VALUES (
    v_tx_id, v_tx_number, p_class_id, p_direction, p_transaction_type, p_amount,
    p_description, p_mission_id, 'completed', v_current_balance, v_balance_after, v_user_id, now()
  );

  -- 7. Insert items if any
  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
      item_id UUID, item_name TEXT, item_type TEXT, quantity INT, unit TEXT, unit_price BIGINT, subtotal BIGINT
    ) LOOP
      INSERT INTO public.transaction_items (
        id, transaction_id, item_id, item_name, item_type, quantity, unit, unit_price, subtotal, created_at
      ) VALUES (
        gen_random_uuid(), v_tx_id, v_item.item_id, v_item.item_name, v_item.item_type,
        v_item.quantity, v_item.unit, v_item.unit_price, v_item.subtotal, now()
      );
    END LOOP;
  END IF;

  -- 8. Update class balance
  UPDATE public.classes SET current_balance = v_balance_after, updated_at = now() WHERE id = p_class_id;

  -- 9. Form return json
  SELECT jsonb_build_object(
    'transaction_id', v_tx_id,
    'transaction_number', v_tx_number,
    'new_balance', v_balance_after
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supabase RPC: set_class_balance
CREATE OR REPLACE FUNCTION public.set_class_balance(
  p_class_id UUID,
  p_new_balance BIGINT,
  p_reason TEXT
) RETURNS BIGINT AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_old_balance BIGINT;
  v_difference BIGINT;
  v_direction TEXT;
  v_type TEXT;
  v_tx_id UUID;
  v_tx_number TEXT;
BEGIN
  -- 1. Check user role is admin
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;
  IF v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- 2. Get old balance and lock
  SELECT current_balance INTO v_old_balance FROM public.classes WHERE id = p_class_id FOR UPDATE;
  IF v_old_balance IS NULL THEN
    RAISE EXCEPTION 'Class not found';
  END IF;
  
  -- 3. Calculate difference
  v_difference := p_new_balance - v_old_balance;
  IF v_difference = 0 THEN
    RETURN p_new_balance;
  END IF;

  IF v_difference > 0 THEN
    v_direction := 'income';
    v_type := 'adjustment_add';
  ELSE
    v_direction := 'expense';
    v_type := 'adjustment_subtract';
  END IF;

  -- 4. Generate transaction number
  v_tx_number := 'TX-ADJ-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.transaction_number_seq')::text, 4, '0');
  v_tx_id := gen_random_uuid();

  -- 5. Insert transaction
  INSERT INTO public.transactions (
    id, transaction_number, class_id, direction, transaction_type, amount,
    description, status, balance_before, balance_after, created_by, created_at
  ) VALUES (
    v_tx_id, v_tx_number, p_class_id, v_direction, v_type, abs(v_difference),
    p_reason, 'completed', v_old_balance, p_new_balance, v_user_id, now()
  );

  -- 6. Insert balance adjustment record
  INSERT INTO public.balance_adjustments (
    id, class_id, old_balance, new_balance, difference, reason, transaction_id, created_by, created_at
  ) VALUES (
    gen_random_uuid(), p_class_id, v_old_balance, p_new_balance, v_difference, p_reason, v_tx_id, v_user_id, now()
  );

  -- 7. Update class balance
  UPDATE public.classes SET current_balance = p_new_balance, updated_at = now() WHERE id = p_class_id;

  RETURN p_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supabase RPC: create_public_transaction
-- Allowed for public (unauthenticated) access using facilitator PIN
CREATE OR REPLACE FUNCTION public.create_public_transaction(
  p_class_id UUID,
  p_direction TEXT,
  p_amount BIGINT,
  p_description TEXT,
  p_pin TEXT
) RETURNS JSONB AS $$
DECLARE
  v_class_active BOOLEAN;
  v_current_balance BIGINT;
  v_balance_after BIGINT;
  v_tx_id UUID;
  v_tx_number TEXT;
  v_valid_pin TEXT;
  v_result JSONB;
BEGIN
  -- 1. Check PIN from app_settings
  SELECT facilitator_pin INTO v_valid_pin
  FROM public.app_settings
  WHERE id = '00000000-0000-0000-0000-000000000000'::uuid;

  IF v_valid_pin IS NULL OR v_valid_pin != p_pin THEN
    RAISE EXCEPTION 'PIN Fasilitator tidak valid';
  END IF;

  -- 2. Check active class and lock class row
  SELECT is_active, current_balance INTO v_class_active, v_current_balance
  FROM public.classes WHERE id = p_class_id FOR UPDATE;
  
  IF v_class_active IS NULL THEN
    RAISE EXCEPTION 'Kelas tidak ditemukan';
  END IF;
  
  IF NOT v_class_active THEN
    RAISE EXCEPTION 'Kelas sedang tidak aktif';
  END IF;

  -- 3. Check amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Jumlah LM harus lebih dari 0';
  END IF;

  -- 4. Calculate new balance
  IF p_direction = 'income' THEN
    v_balance_after := v_current_balance + p_amount;
  ELSIF p_direction = 'expense' THEN
    v_balance_after := v_current_balance - p_amount;
    IF v_balance_after < 0 THEN
      RAISE EXCEPTION 'Saldo tidak mencukupi. Saldo: %, Diminta: %', v_current_balance, p_amount;
    END IF;
  ELSE
    RAISE EXCEPTION 'Arah transaksi tidak valid: %', p_direction;
  END IF;

  -- 5. Create transaction
  v_tx_id := gen_random_uuid();
  v_tx_number := 'FAS-' || upper(substr(md5(random()::text), 1, 8));

  INSERT INTO public.transactions (
    id,
    transaction_number,
    class_id,
    direction,
    transaction_type,
    amount,
    description,
    status,
    balance_before,
    balance_after,
    created_at
  ) VALUES (
    v_tx_id,
    v_tx_number,
    p_class_id,
    p_direction,
    'facilitator_adjustment',
    p_amount,
    p_description,
    'completed',
    v_current_balance,
    v_balance_after,
    now()
  );

  -- 6. Update class balance
  UPDATE public.classes
  SET current_balance = v_balance_after, updated_at = now()
  WHERE id = p_class_id;

  -- Return result
  v_result := jsonb_build_object(
    'transaction_id', v_tx_id,
    'transaction_number', v_tx_number,
    'balance_after', v_balance_after
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supabase RPC: cancel_lm_transaction
CREATE OR REPLACE FUNCTION public.cancel_lm_transaction(
  p_transaction_id UUID,
  p_reason TEXT
) RETURNS BIGINT AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_tx_status TEXT;
  v_class_id UUID;
  v_direction TEXT;
  v_amount BIGINT;
  v_current_balance BIGINT;
  v_new_balance BIGINT;
  v_banker_can_cancel BOOLEAN;
  v_tx_created_by UUID;
BEGIN
  -- 1. Get transaction info and lock
  SELECT status, class_id, direction, amount, created_by
  INTO v_tx_status, v_class_id, v_direction, v_amount, v_tx_created_by
  FROM public.transactions WHERE id = p_transaction_id FOR UPDATE;

  IF v_tx_status IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_tx_status != 'completed' THEN
    RAISE EXCEPTION 'Transaction is not completed';
  END IF;

  -- 2. Check permission
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;
  
  IF v_user_role = 'banker' THEN
    -- Check if settings allow banker cancellation
    SELECT banker_can_cancel INTO v_banker_can_cancel FROM public.app_settings LIMIT 1;
    IF NOT COALESCE(v_banker_can_cancel, true) THEN
      RAISE EXCEPTION 'Banker is not allowed to cancel transactions';
    END IF;
    -- Banker can only cancel their own transactions
    IF v_tx_created_by != v_user_id THEN
      RAISE EXCEPTION 'Banker can only cancel their own transactions';
    END IF;
  ELSIF v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- 3. Lock class balance
  SELECT current_balance INTO v_current_balance FROM public.classes WHERE id = v_class_id FOR UPDATE;

  -- 4. Calculate refunded balance
  -- If original was income, cancellation means we subtract it
  -- If original was expense, cancellation means we add it back
  IF v_direction = 'income' THEN
    v_new_balance := v_current_balance - v_amount;
    IF v_new_balance < 0 THEN
      RAISE EXCEPTION 'Cannot cancel transaction. Reversing this income would make the class balance negative.';
    END IF;
  ELSE
    v_new_balance := v_current_balance + v_amount;
  END IF;

  -- 5. Update transaction status
  UPDATE public.transactions SET
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = v_user_id,
    cancellation_reason = p_reason
  WHERE id = p_transaction_id;

  -- 6. Update class balance
  UPDATE public.classes SET current_balance = v_new_balance, updated_at = now() WHERE id = v_class_id;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supabase RPC: edit_lm_transaction
CREATE OR REPLACE FUNCTION public.edit_lm_transaction(
  p_transaction_id UUID,
  p_new_amount BIGINT,
  p_reason TEXT,
  p_description TEXT DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_tx_status TEXT;
  v_class_id UUID;
  v_direction TEXT;
  v_old_amount BIGINT;
  v_current_balance BIGINT;
  v_temp_balance BIGINT;
  v_new_balance BIGINT;
  v_metadata JSONB;
BEGIN
  -- 1. Check user is admin
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;
  IF v_user_role != 'admin' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- 2. Get transaction info
  SELECT status, class_id, direction, amount, metadata
  INTO v_tx_status, v_class_id, v_direction, v_old_amount, v_metadata
  FROM public.transactions WHERE id = p_transaction_id FOR UPDATE;

  IF v_tx_status IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_tx_status != 'completed' THEN
    RAISE EXCEPTION 'Can only edit completed transactions';
  END IF;

  IF p_new_amount <= 0 THEN
    RAISE EXCEPTION 'New amount must be greater than zero';
  END IF;

  -- 3. Lock class balance
  SELECT current_balance INTO v_current_balance FROM public.classes WHERE id = v_class_id FOR UPDATE;

  -- 4. Reverse the old transaction amount effect
  IF v_direction = 'income' THEN
    v_temp_balance := v_current_balance - v_old_amount;
  ELSE
    v_temp_balance := v_current_balance + v_old_amount;
  END IF;

  -- 5. Apply new transaction amount
  IF v_direction = 'income' THEN
    v_new_balance := v_temp_balance + p_new_amount;
  ELSE
    v_new_balance := v_temp_balance - p_new_amount;
  END IF;

  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Cannot edit transaction. Resulting class balance would be negative.';
  END IF;

  -- 6. Store original amount in metadata for audit log
  IF v_metadata IS NULL THEN
    v_metadata := '{}'::jsonb;
  END IF;
  
  v_metadata := jsonb_set(v_metadata, '{history}', COALESCE(v_metadata->'history', '[]'::jsonb) || jsonb_build_object(
    'edited_at', now(),
    'edited_by', v_user_id,
    'old_amount', v_old_amount,
    'new_amount', p_new_amount,
    'reason', p_reason
  ));

  -- 7. Update transaction
  UPDATE public.transactions SET
    amount = p_new_amount,
    description = COALESCE(p_description, description),
    edited_at = now(),
    edited_by = v_user_id,
    edit_reason = p_reason,
    metadata = v_metadata,
    balance_after = v_new_balance
  WHERE id = p_transaction_id;

  -- 8. Update class balance
  UPDATE public.classes SET current_balance = v_new_balance, updated_at = now() WHERE id = v_class_id;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supabase RPC: get_public_wallet
CREATE OR REPLACE FUNCTION public.get_public_wallet(p_public_token TEXT)
RETURNS TABLE (
  app_name TEXT,
  activity_name TEXT,
  participant_message TEXT,
  class_name TEXT,
  class_code TEXT,
  class_color TEXT,
  class_icon TEXT,
  current_balance BIGINT,
  total_income BIGINT,
  total_expense BIGINT,
  last_updated TIMESTAMPTZ,
  transactions JSONB
) AS $$
DECLARE
  v_class_id UUID;
  v_class_name TEXT;
  v_class_code TEXT;
  v_class_color TEXT;
  v_class_icon TEXT;
  v_curr_bal BIGINT;
  v_total_inc BIGINT;
  v_total_exp BIGINT;
  v_last_upd TIMESTAMPTZ;
  v_app_name TEXT;
  v_act_name TEXT;
  v_part_msg TEXT;
  v_tx_json JSONB;
BEGIN
  -- Get class details
  SELECT c.id, c.name, c.code, c.color, c.icon, c.current_balance, c.updated_at
  INTO v_class_id, v_class_name, v_class_code, v_class_color, v_class_icon, v_curr_bal, v_last_upd
  FROM public.classes c WHERE c.public_token = p_public_token AND c.is_active = true;

  IF v_class_id IS NULL THEN
    RETURN;
  END IF;

  -- Get app settings
  SELECT s.app_name, s.activity_name, s.participant_message
  INTO v_app_name, v_act_name, v_part_msg
  FROM public.app_settings s LIMIT 1;

  -- Calculate totals
  SELECT COALESCE(SUM(amount), 0) INTO v_total_inc
  FROM public.transactions
  WHERE class_id = v_class_id AND direction = 'income' AND status = 'completed';

  SELECT COALESCE(SUM(amount), 0) INTO v_total_exp
  FROM public.transactions
  WHERE class_id = v_class_id AND direction = 'expense' AND status = 'completed';

  -- Get transactions and items
  SELECT COALESCE(jsonb_agg(tx), '[]'::jsonb) INTO v_tx_json
  FROM (
    SELECT 
      t.id,
      t.transaction_number,
      t.direction,
      t.transaction_type,
      t.amount,
      t.description,
      t.created_at,
      COALESCE(
        (SELECT jsonb_agg(ti) 
         FROM (
           SELECT item_name, item_type, quantity, unit, unit_price, subtotal
           FROM public.transaction_items
           WHERE transaction_id = t.id
         ) ti
        ), 
        '[]'::jsonb
      ) AS items
    FROM public.transactions t
    WHERE t.class_id = v_class_id AND t.status = 'completed'
    ORDER BY t.created_at DESC
  ) tx;

  RETURN QUERY SELECT 
    COALESCE(v_app_name, 'LM Wallet'), 
    COALESCE(v_act_name, 'Leadership Training'), 
    v_part_msg, 
    v_class_name, 
    v_class_code, 
    v_class_color, 
    v_class_icon, 
    v_curr_bal, 
    v_total_inc, 
    v_total_exp, 
    v_last_upd, 
    v_tx_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supabase RPC: lookup_class_by_rfid
CREATE OR REPLACE FUNCTION public.lookup_class_by_rfid(p_rfid_uid TEXT)
RETURNS TABLE (
  class_id UUID,
  class_name TEXT,
  class_code TEXT,
  class_color TEXT,
  class_icon TEXT,
  current_balance BIGINT,
  public_token TEXT,
  card_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS class_id,
    c.name AS class_name,
    c.code AS class_code,
    c.color AS class_color,
    c.icon AS class_icon,
    c.current_balance,
    c.public_token,
    cc.status AS card_status
  FROM public.classes c
  JOIN public.class_cards cc ON c.id = cc.class_id
  WHERE cc.rfid_uid = p_rfid_uid AND c.is_active = true AND cc.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supabase RPC: lookup_class_by_qr
CREATE OR REPLACE FUNCTION public.lookup_class_by_qr(p_qr_token TEXT)
RETURNS TABLE (
  class_id UUID,
  class_name TEXT,
  class_code TEXT,
  class_color TEXT,
  class_icon TEXT,
  current_balance BIGINT,
  public_token TEXT,
  card_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS class_id,
    c.name AS class_name,
    c.code AS class_code,
    c.color AS class_color,
    c.icon AS class_icon,
    c.current_balance,
    c.public_token,
    cc.status AS card_status
  FROM public.classes c
  JOIN public.class_cards cc ON c.id = cc.class_id
  WHERE cc.qr_token = p_qr_token AND c.is_active = true AND cc.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security Configuration
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_adjustments ENABLE ROW LEVEL SECURITY;

-- 1. Profiles policies
CREATE POLICY "Public profile view" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Admin inserts profiles" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin updates profiles" ON public.profiles
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin deletes profiles" ON public.profiles
    FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. App settings policies
CREATE POLICY "Everyone reads app settings" ON public.app_settings
    FOR SELECT USING (true);

CREATE POLICY "Admin manages app settings" ON public.app_settings
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. Classes policies
CREATE POLICY "Everyone reads active classes" ON public.classes
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin manages classes" ON public.classes
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. Class cards policies
CREATE POLICY "Banker and Admin read cards" ON public.class_cards
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'banker')));

CREATE POLICY "Admin manages cards" ON public.class_cards
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 5. Missions policies
CREATE POLICY "Everyone reads missions" ON public.missions
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin manages missions" ON public.missions
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 6. Items policies
CREATE POLICY "Everyone reads items" ON public.items
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin manages items" ON public.items
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 7. Transactions policies
CREATE POLICY "Authenticated users view all transactions" ON public.transactions
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admin and Banker inserts transactions" ON public.transactions
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'banker')));

-- Allow public read of completed transactions if they know the public token (through the RPC or via a check)
CREATE POLICY "Public views class transactions" ON public.transactions
    FOR SELECT TO anon
    USING (
        EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = transactions.class_id AND c.is_active = true
        ) AND status = 'completed'
    );

-- 8. Transaction items policies
CREATE POLICY "Authenticated users view all transaction items" ON public.transaction_items
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Public views transaction items" ON public.transaction_items
    FOR SELECT TO anon
    USING (
        EXISTS (
            SELECT 1 FROM public.transactions t
            JOIN public.classes c ON t.class_id = c.id
            WHERE t.id = transaction_items.transaction_id AND c.is_active = true AND t.status = 'completed'
        )
    );

-- 9. Balance adjustments policies
CREATE POLICY "Authenticated users view adjustments" ON public.balance_adjustments
    FOR SELECT TO authenticated
    USING (true);
