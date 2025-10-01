-- Create enhanced database functions for demo user management

-- Function to validate demo user setup requirements
CREATE OR REPLACE FUNCTION public.validate_demo_user_setup(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  validation_result jsonb := '{"valid": true, "issues": []}'::jsonb;
  issues text[] := '{}';
BEGIN
  -- Check if user ID is valid
  IF p_user_id IS NULL THEN
    issues := array_append(issues, 'User ID cannot be null');
  END IF;
  
  -- Check if referral code already exists for this user
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND referral_code IS NOT NULL) THEN
    issues := array_append(issues, 'User already has a referral code assigned');
  END IF;
  
  -- Check if user already has wallets
  IF EXISTS (SELECT 1 FROM public.wallets WHERE user_id = p_user_id) THEN
    issues := array_append(issues, 'User already has wallets created');
  END IF;
  
  -- Update result based on issues found
  IF array_length(issues, 1) > 0 THEN
    validation_result := jsonb_build_object(
      'valid', false,
      'issues', to_jsonb(issues),
      'recommendation', 'Consider cleaning up existing data before setup'
    );
  END IF;
  
  RETURN validation_result;
END;
$$;

-- Function to cleanup demo user data
CREATE OR REPLACE FUNCTION public.cleanup_demo_user_data(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleanup_result jsonb;
  rows_affected integer := 0;
BEGIN
  -- Start transaction
  BEGIN
    -- Remove existing transactions
    DELETE FROM public.transactions WHERE user_id = p_user_id;
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    
    -- Remove existing user shares
    DELETE FROM public.user_shares WHERE user_id = p_user_id;
    
    -- Remove existing wallets
    DELETE FROM public.wallets WHERE user_id = p_user_id;
    
    -- Clear referral code from profile to avoid constraint violations
    UPDATE public.profiles 
    SET referral_code = NULL, 
        updated_at = now()
    WHERE id = p_user_id;
    
    cleanup_result := jsonb_build_object(
      'success', true,
      'message', 'Demo user data cleaned up successfully',
      'transactions_removed', rows_affected,
      'user_id', p_user_id
    );
    
    RETURN cleanup_result;
    
  EXCEPTION WHEN OTHERS THEN
    -- Rollback will happen automatically
    cleanup_result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
    
    RETURN cleanup_result;
  END;
END;
$$;

-- Function to get demo user setup status
CREATE OR REPLACE FUNCTION public.get_demo_user_status(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  status_result jsonb;
  profile_exists boolean := false;
  wallets_count integer := 0;
  transactions_count integer := 0;
  shares_count integer := 0;
BEGIN
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO profile_exists;
  
  -- Count related records
  SELECT COUNT(*) INTO wallets_count FROM public.wallets WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO transactions_count FROM public.transactions WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO shares_count FROM public.user_shares WHERE user_id = p_user_id;
  
  status_result := jsonb_build_object(
    'user_id', p_user_id,
    'profile_exists', profile_exists,
    'wallets_count', wallets_count,
    'transactions_count', transactions_count,
    'shares_count', shares_count,
    'setup_complete', profile_exists AND wallets_count > 0,
    'last_checked', now()
  );
  
  RETURN status_result;
END;
$$;

-- Enhanced setup_demo_user_data function with better error handling
CREATE OR REPLACE FUNCTION public.setup_demo_user_data(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  new_referral_code text;
  ugx_wallet_id uuid;
  usd_wallet_id uuid;
BEGIN
  -- Start transaction with savepoint
  BEGIN
    -- Generate unique referral code
    new_referral_code := public.generate_unique_referral_code();
    
    -- Create or update profile with comprehensive data
    INSERT INTO public.profiles (
      id,
      full_name,
      email,
      phone,
      date_of_birth,
      gender,
      nationality,
      country_of_residence,
      address,
      user_type,
      account_type,
      account_activation_status,
      referral_code,
      status,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      'Demo User',
      'demo@yawatu.com',
      '+256700000000',
      '1990-01-01',
      'male',
      'Ugandan',
      'Uganda',
      'Kampala, Uganda',
      'individual',
      'standard',
      'activated',
      new_referral_code,
      'active',
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      referral_code = CASE 
        WHEN profiles.referral_code IS NULL THEN new_referral_code
        ELSE profiles.referral_code
      END,
      account_activation_status = 'activated',
      status = 'active',
      updated_at = now();

    -- Create UGX wallet
    INSERT INTO public.wallets (user_id, currency, balance, status)
    VALUES (p_user_id, 'UGX', 5000000, 'active')
    ON CONFLICT (user_id, currency) DO UPDATE SET
      balance = GREATEST(wallets.balance, 5000000),
      status = 'active',
      updated_at = now()
    RETURNING id INTO ugx_wallet_id;

    -- Create USD wallet  
    INSERT INTO public.wallets (user_id, currency, balance, status)
    VALUES (p_user_id, 'USD', 1000, 'active')
    ON CONFLICT (user_id, currency) DO UPDATE SET
      balance = GREATEST(wallets.balance, 1000),
      status = 'active',
      updated_at = now()
    RETURNING id INTO usd_wallet_id;

    -- Create initial demo transactions
    INSERT INTO public.transactions (
      user_id, wallet_id, amount, currency, transaction_type, 
      status, approval_status, description
    ) VALUES 
    (p_user_id, ugx_wallet_id, 5000000, 'UGX', 'deposit', 'completed', 'approved', 'Demo account initial funding'),
    (p_user_id, usd_wallet_id, 1000, 'USD', 'deposit', 'completed', 'approved', 'Demo account USD funding')
    ON CONFLICT DO NOTHING;

    result := jsonb_build_object(
      'success', true,
      'message', 'Demo user data setup completed successfully',
      'user_id', p_user_id,
      'referral_code', new_referral_code,
      'wallets_created', jsonb_build_object(
        'ugx_wallet_id', ugx_wallet_id,
        'usd_wallet_id', usd_wallet_id
      ),
      'setup_timestamp', now()
    );

    RETURN result;

  EXCEPTION WHEN OTHERS THEN
    -- Detailed error information for debugging
    result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE,
      'error_detail', CASE 
        WHEN SQLSTATE = '23505' THEN 'Unique constraint violation - possible duplicate data'
        WHEN SQLSTATE = '23503' THEN 'Foreign key constraint violation'
        WHEN SQLSTATE = '23514' THEN 'Check constraint violation'
        ELSE 'Database error occurred'
      END,
      'user_id', p_user_id,
      'timestamp', now()
    );
    
    RETURN result;
  END;
END;
$$;