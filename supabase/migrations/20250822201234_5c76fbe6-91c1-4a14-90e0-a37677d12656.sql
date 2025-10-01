-- Update the auto-approval function to check for 250 shares threshold
CREATE OR REPLACE FUNCTION public.check_auto_approval(p_transfer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  transfer_record RECORD;
  settings_record RECORD;
BEGIN
  -- Get transfer details
  SELECT * INTO transfer_record
  FROM public.share_transfer_requests
  WHERE id = p_transfer_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Auto-approve if quantity is 250 shares or less
  IF transfer_record.quantity <= 250 THEN
    RETURN TRUE;
  END IF;
  
  -- Above 250 shares requires admin approval
  RETURN FALSE;
END;
$$;