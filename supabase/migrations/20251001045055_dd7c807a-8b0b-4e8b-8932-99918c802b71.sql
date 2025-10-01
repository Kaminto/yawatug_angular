-- Relax guard to allow trusted internal roles while still blocking client-side direct balance edits
CREATE OR REPLACE FUNCTION public.prevent_manual_wallet_balance_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow updates explicitly permitted within a trusted transaction scope
  IF current_setting('app.allow_wallet_update', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Allow updates executed by trusted internal roles (edge functions / admin maintenance)
  -- Note: client traffic runs as 'anon'/'authenticated' via PostgREST, not these roles
  IF current_user IN ('service_role', 'supabase_admin', 'postgres') THEN
    RETURN NEW;
  END IF;

  -- Block client-side direct balance modifications
  IF OLD.balance IS DISTINCT FROM NEW.balance THEN
    RAISE EXCEPTION 'Direct wallet balance updates are not allowed. Use transactions table instead.';
  END IF;

  RETURN NEW;
END;
$$;
