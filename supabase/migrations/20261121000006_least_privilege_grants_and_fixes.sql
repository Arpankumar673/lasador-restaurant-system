-- ==============================================================================
-- L'ASADOR – GRILL & BREW | INDEPENDENT SUPABASE FOUNDATION
-- Migration: 20261121000006_least_privilege_grants_and_fixes.sql
-- Scope: Least-Privilege Grants (F-01), Split Payments (F-02), Atomic Order RPC (F-03), Currency Precision (F-05)
-- Location: Sector 82, JLPL Industrial Area, Mohali, Punjab (Asia/Kolkata)
-- ==============================================================================

-- 1. BILL STATUS ENUM & BILLS TABLE SCHEMA UPDATES (F-02)
DO $$ BEGIN
  ALTER TYPE bill_status ADD VALUE IF NOT EXISTS 'partially_paid';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE bills
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
  ADD COLUMN IF NOT EXISTS balance_remaining NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (balance_remaining >= 0);

-- Safely initialize existing records
UPDATE bills
SET amount_paid = final_total, balance_remaining = 0.00
WHERE status = 'settled' AND amount_paid = 0.00 AND balance_remaining = 0.00;

UPDATE bills
SET amount_paid = 0.00, balance_remaining = final_total
WHERE status IN ('open', 'requested') AND amount_paid = 0.00 AND balance_remaining = 0.00;

-- 2. LEAST-PRIVILEGE POSTGREST GRANTS (F-01)
-- Ensure PostgREST roles can access schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Revoke all table privileges from anon by default
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;

-- Grant least-privilege SELECT access to anon ONLY for customer QR menu browsing
GRANT SELECT ON TABLE
  public.restaurant_settings,
  public.business_hours,
  public.tax_settings,
  public.categories,
  public.products,
  public.product_images,
  public.product_variants,
  public.modifier_groups,
  public.modifiers,
  public.product_modifier_groups,
  public.dining_tables,
  public.table_sessions
TO anon;

-- SENSITIVE TABLES MUST NEVER BE ACCESSIBLE TO anon:
-- profiles, staff_roles, staff_permissions, audit_logs, table_qr_tokens,
-- orders, order_items, order_item_modifiers, bills, payments have NO direct grants to anon.

-- Staff role (authenticated) permissions (Strictly governed by Row Level Security)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Service role (server-side Next.js admin client) has full administrative grants
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

-- 3. RECURSION-FREE ROLE LOOKUP WITH PINNED SEARCH PATH (F-01)
CREATE OR REPLACE FUNCTION public.get_profile_role(user_id UUID)
RETURNS staff_role AS $$
  SELECT role FROM public.profiles WHERE id = user_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.get_profile_role(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_role(UUID) TO authenticated, service_role;

-- Update profiles RLS policy to strictly prevent self-role escalation
DROP POLICY IF EXISTS "Staff can update own profile contact info without role escalation" ON profiles;

CREATE POLICY "Staff can update own profile contact info without role escalation"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = public.get_profile_role(auth.uid())
  );

-- 4. ATOMIC CUSTOMER ORDER CREATION RPC (F-03 & F-05)
-- Performs entire order validation, canonical price calculation, order creation,
-- line items, and modifiers inside a single atomic PostgreSQL transaction.
CREATE OR REPLACE FUNCTION public.create_customer_order(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_table_id UUID;
  v_session_id UUID;
  v_idempotency_key TEXT;
  v_special_instructions TEXT;
  v_items JSONB;

  v_existing_order RECORD;
  v_session_record RECORD;
  v_item RECORD;
  v_mod RECORD;

  v_product RECORD;
  v_variant RECORD;
  v_modifier RECORD;

  v_unit_price NUMERIC(10, 2);
  v_variant_name TEXT;
  v_modifier_total NUMERIC(10, 2);
  v_item_subtotal NUMERIC(10, 2);

  v_calculated_subtotal NUMERIC(10, 2) := 0.00;
  v_cgst NUMERIC(10, 2);
  v_sgst NUMERIC(10, 2);
  v_tax_total NUMERIC(10, 2);
  v_final_total NUMERIC(10, 2);

  v_today_str TEXT;
  v_random_suffix INT;
  v_order_number TEXT;
  v_new_order_id UUID;
  v_new_item_id UUID;

  v_inserted_items_count INT := 0;
BEGIN
  -- 1. Extract payload fields
  v_table_id := (payload->>'tableId')::UUID;
  v_session_id := (payload->>'sessionId')::UUID;
  v_idempotency_key := TRIM(payload->>'idempotencyKey');
  v_special_instructions := NULLIF(TRIM(payload->>'specialInstructions'), '');
  v_items := payload->'items';

  IF v_table_id IS NULL OR v_session_id IS NULL OR v_idempotency_key IS NULL OR v_items IS NULL THEN
    RAISE EXCEPTION 'Invalid order payload: tableId, sessionId, idempotencyKey and items are required.';
  END IF;

  IF jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item.';
  END IF;

  -- 2. Check Idempotency: Return existing order if key was already submitted
  SELECT id, order_number INTO v_existing_order
  FROM public.orders
  WHERE idempotency_key = v_idempotency_key
  LIMIT 1;

  IF v_existing_order.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_existing_order.id,
      'order_number', v_existing_order.order_number,
      'is_duplicate', true
    );
  END IF;

  -- 3. Verify Table Session is Active
  SELECT id, status INTO v_session_record
  FROM public.table_sessions
  WHERE id = v_session_id AND table_id = v_table_id AND status = 'active'
  LIMIT 1;

  IF v_session_record.id IS NULL THEN
    RAISE EXCEPTION 'Dining session is inactive, expired, or invalid for this table.';
  END IF;

  -- 4. Calculate Subtotals and Validate All Items Server-Side
  FOR v_item IN SELECT * FROM jsonb_to_recordset(v_items) AS (
    "productId" UUID,
    "variantId" UUID,
    "quantity" INT,
    "customerNotes" TEXT,
    "selectedModifierIds" UUID[]
  )
  LOOP
    IF v_item."quantity" IS NULL OR v_item."quantity" <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be a positive integer.';
    END IF;

    -- Fetch Product
    SELECT id, name, base_price, prep_station, is_available, is_active
    INTO v_product
    FROM public.products
    WHERE id = v_item."productId"
    LIMIT 1;

    IF v_product.id IS NULL OR NOT v_product.is_active OR NOT v_product.is_available THEN
      RAISE EXCEPTION 'Product "%" is currently unavailable or inactive.', COALESCE(v_product.name, 'Selected item');
    END IF;

    v_unit_price := v_product.base_price;
    v_variant_name := NULL;

    -- Fetch Variant if specified
    IF v_item."variantId" IS NOT NULL THEN
      SELECT id, name, price, is_available
      INTO v_variant
      FROM public.product_variants
      WHERE id = v_item."variantId" AND product_id = v_product.id
      LIMIT 1;

      IF v_variant.id IS NULL OR NOT v_variant.is_available THEN
        RAISE EXCEPTION 'Portion variant for "%" is currently unavailable.', v_product.name;
      END IF;

      v_unit_price := v_variant.price;
      v_variant_name := v_variant.name;
    END IF;

    -- Calculate Modifiers
    v_modifier_total := 0.00;
    IF v_item."selectedModifierIds" IS NOT NULL AND array_length(v_item."selectedModifierIds", 1) > 0 THEN
      FOR v_mod IN
        SELECT id, name, price_delta, is_available
        FROM public.modifiers
        WHERE id = ANY(v_item."selectedModifierIds")
      LOOP
        IF NOT v_mod.is_available THEN
          RAISE EXCEPTION 'Modifier "%" is currently unavailable.', v_mod.name;
        END IF;
        v_modifier_total := v_modifier_total + v_mod.price_delta;
      END LOOP;
    END IF;

    v_item_subtotal := ROUND(((v_unit_price + v_modifier_total) * v_item."quantity")::numeric, 2);
    v_calculated_subtotal := v_calculated_subtotal + v_item_subtotal;
  END LOOP;

  -- 5. Compute Statutory 5% Indian GST (2.5% CGST + 2.5% SGST)
  v_cgst := ROUND((v_calculated_subtotal * 0.025)::numeric, 2);
  v_sgst := ROUND((v_calculated_subtotal * 0.025)::numeric, 2);
  v_tax_total := v_cgst + v_sgst;
  v_final_total := ROUND((v_calculated_subtotal + v_tax_total)::numeric, 2);

  -- 6. Generate Unique Order Number
  v_today_str := to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYMMDD');
  v_random_suffix := floor(1000 + random() * 9000)::int;
  v_order_number := 'ORD-' || v_today_str || '-' || v_random_suffix;

  -- 7. Insert Order Master Record
  INSERT INTO public.orders (
    order_number,
    table_id,
    session_id,
    status,
    idempotency_key,
    subtotal,
    tax_total,
    service_charge,
    discount_total,
    total_amount,
    special_notes
  ) VALUES (
    v_order_number,
    v_table_id,
    v_session_id,
    'new',
    v_idempotency_key,
    v_calculated_subtotal,
    v_tax_total,
    0.00,
    0.00,
    v_final_total,
    v_special_instructions
  ) RETURNING id INTO v_new_order_id;

  -- 8. Insert Order Items & Item Modifiers
  FOR v_item IN SELECT * FROM jsonb_to_recordset(v_items) AS (
    "productId" UUID,
    "variantId" UUID,
    "quantity" INT,
    "customerNotes" TEXT,
    "selectedModifierIds" UUID[]
  )
  LOOP
    SELECT id, name, base_price, prep_station
    INTO v_product
    FROM public.products
    WHERE id = v_item."productId" LIMIT 1;

    v_unit_price := v_product.base_price;
    v_variant_name := NULL;

    IF v_item."variantId" IS NOT NULL THEN
      SELECT name, price INTO v_variant
      FROM public.product_variants
      WHERE id = v_item."variantId" LIMIT 1;
      v_unit_price := v_variant.price;
      v_variant_name := v_variant.name;
    END IF;

    v_modifier_total := 0.00;
    IF v_item."selectedModifierIds" IS NOT NULL AND array_length(v_item."selectedModifierIds", 1) > 0 THEN
      SELECT COALESCE(SUM(price_delta), 0.00) INTO v_modifier_total
      FROM public.modifiers
      WHERE id = ANY(v_item."selectedModifierIds");
    END IF;

    v_item_subtotal := ROUND(((v_unit_price + v_modifier_total) * v_item."quantity")::numeric, 2);

    INSERT INTO public.order_items (
      order_id,
      product_id,
      variant_id,
      product_name_snapshot,
      variant_name_snapshot,
      unit_price_snapshot,
      quantity,
      subtotal,
      station,
      prep_status,
      customer_notes
    ) VALUES (
      v_new_order_id,
      v_product.id,
      v_item."variantId",
      v_product.name,
      v_variant_name,
      v_unit_price,
      v_item."quantity",
      v_item_subtotal,
      v_product.prep_station,
      'pending',
      v_item."customerNotes"
    ) RETURNING id INTO v_new_item_id;

    v_inserted_items_count := v_inserted_items_count + 1;

    -- Insert snapshot modifiers
    IF v_item."selectedModifierIds" IS NOT NULL AND array_length(v_item."selectedModifierIds", 1) > 0 THEN
      INSERT INTO public.order_item_modifiers (
        order_item_id,
        modifier_id,
        modifier_name_snapshot,
        price_delta_snapshot
      )
      SELECT
        v_new_item_id,
        m.id,
        m.name,
        m.price_delta
      FROM public.modifiers m
      WHERE m.id = ANY(v_item."selectedModifierIds");
    END IF;
  END LOOP;

  -- Return Success Result
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_new_order_id,
    'order_number', v_order_number,
    'subtotal', v_calculated_subtotal,
    'tax_total', v_tax_total,
    'total_amount', v_final_total,
    'items_count', v_inserted_items_count
  );
END;
$$;

-- Allow anon, authenticated, and service_role to call the atomic order function
REVOKE EXECUTE ON FUNCTION public.create_customer_order(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_customer_order(JSONB) TO anon, authenticated, service_role;

-- 5. ATOMIC BILL PAYMENT & SPLIT SETTLEMENT RPC (F-02 & F-05)
-- Enforces row-level locking (FOR UPDATE) to prevent concurrent payment race conditions.
-- Supports split payments across multiple tenders (Cash, UPI, Card, POS).
-- Prevents overpayment and closes session/releases table ONLY when balance reaches zero.
CREATE OR REPLACE FUNCTION public.record_bill_payment_atomic(
  p_bill_id UUID,
  p_payment_method payment_method,
  p_amount NUMERIC(10, 2),
  p_transaction_ref TEXT,
  p_collected_by UUID,
  p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bill RECORD;
  v_new_amount_paid NUMERIC(10, 2);
  v_new_balance NUMERIC(10, 2);
  v_is_fully_settled BOOLEAN;
  v_new_status bill_status;
  v_payment_id UUID;
BEGIN
  IF p_bill_id IS NULL THEN
    RAISE EXCEPTION 'Missing target bill ID.';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0.00 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero.';
  END IF;

  -- 1. Row Lock Target Bill to Prevent Concurrent Payment Races
  SELECT id, bill_number, session_id, table_id, status, final_total, amount_paid, balance_remaining
  INTO v_bill
  FROM public.bills
  WHERE id = p_bill_id
  FOR UPDATE;

  IF v_bill.id IS NULL THEN
    RAISE EXCEPTION 'Bill record not found.';
  END IF;

  IF v_bill.status = 'settled' OR v_bill.balance_remaining <= 0.00 THEN
    RAISE EXCEPTION 'Bill "%" is already fully settled.', v_bill.bill_number;
  END IF;

  IF v_bill.status = 'voided' THEN
    RAISE EXCEPTION 'Cannot record payment on a voided bill.';
  END IF;

  -- 2. Validate Overpayment
  IF p_amount > v_bill.balance_remaining THEN
    RAISE EXCEPTION 'Overpayment rejected: payment of ₹% exceeds outstanding balance of ₹%.',
      p_amount, v_bill.balance_remaining;
  END IF;

  -- 3. Calculate New Balances
  v_new_amount_paid := ROUND((v_bill.amount_paid + p_amount)::numeric, 2);
  v_new_balance := ROUND((v_bill.final_total - v_new_amount_paid)::numeric, 2);
  v_is_fully_settled := (v_new_balance <= 0.00);

  IF v_is_fully_settled THEN
    v_new_status := 'settled'::bill_status;
  ELSE
    v_new_status := 'partially_paid'::bill_status;
  END IF;

  -- 4. Insert Payment Record
  INSERT INTO public.payments (
    bill_id,
    payment_method,
    status,
    amount,
    transaction_reference,
    collected_by,
    notes
  ) VALUES (
    p_bill_id,
    p_payment_method,
    'completed',
    p_amount,
    p_transaction_ref,
    p_collected_by,
    p_notes
  ) RETURNING id INTO v_payment_id;

  -- 5. Update Bill Master Record
  UPDATE public.bills
  SET
    amount_paid = v_new_amount_paid,
    balance_remaining = v_new_balance,
    status = v_new_status,
    settled_at = CASE WHEN v_is_fully_settled THEN now() ELSE settled_at END,
    settled_by = CASE WHEN v_is_fully_settled THEN p_collected_by ELSE settled_by END,
    updated_at = now()
  WHERE id = p_bill_id;

  -- 6. Close Table Session and Release Table ONLY IF Fully Settled
  IF v_is_fully_settled AND v_bill.session_id IS NOT NULL THEN
    UPDATE public.table_sessions
    SET
      status = 'closed',
      closed_at = now(),
      updated_at = now()
    WHERE id = v_bill.session_id;
  END IF;

  -- 7. Return Result JSONB
  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'bill_number', v_bill.bill_number,
    'amount_paid', v_new_amount_paid,
    'balance_remaining', v_new_balance,
    'is_settled', v_is_fully_settled,
    'status', v_new_status
  );
END;
$$;

-- Allow only authenticated staff and service_role to execute bill settlements
REVOKE EXECUTE ON FUNCTION public.record_bill_payment_atomic(UUID, payment_method, NUMERIC, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_bill_payment_atomic(UUID, payment_method, NUMERIC, TEXT, UUID, TEXT) TO authenticated, service_role;
