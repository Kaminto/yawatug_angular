-- Create admin function to approve and process share transfers
CREATE OR REPLACE FUNCTION public.admin_approve_and_process_transfer(p_transfer_id uuid, p_admin_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  transfer_record RECORD;
  process_result jsonb;
BEGIN
  -- Only allow admins or the system to call this
  IF p_admin_id IS NOT NULL AND NOT is_admin(p_admin_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin permissions required'
    );
  END IF;
  
  -- Get transfer details
  SELECT * INTO transfer_record
  FROM share_transfer_requests
  WHERE id = p_transfer_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transfer request not found'
    );
  END IF;
  
  -- Approve the transfer if pending
  IF transfer_record.status = 'pending' THEN
    UPDATE share_transfer_requests
    SET status = 'approved',
        approved_at = now(),
        processed_by = COALESCE(p_admin_id, auth.uid())
    WHERE id = p_transfer_id;
  END IF;
  
  -- Process the transfer
  SELECT process_share_transfer(p_transfer_id) INTO process_result;
  
  RETURN process_result;
END;
$$;

-- Create function to batch process pending transfers for system use
CREATE OR REPLACE FUNCTION public.system_process_pending_transfers()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  transfer_record RECORD;
  processed_count integer := 0;
  failed_count integer := 0;
  results jsonb := '[]'::jsonb;
  process_result jsonb;
BEGIN
  -- Process all pending transfers
  FOR transfer_record IN 
    SELECT id FROM share_transfer_requests 
    WHERE status = 'pending' 
    ORDER BY created_at ASC
  LOOP
    -- Approve and process each transfer
    SELECT admin_approve_and_process_transfer(transfer_record.id) INTO process_result;
    
    IF (process_result->>'success')::boolean THEN
      processed_count := processed_count + 1;
    ELSE
      failed_count := failed_count + 1;
    END IF;
    
    results := results || jsonb_build_object(
      'transfer_id', transfer_record.id,
      'result', process_result
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'processed_count', processed_count,
    'failed_count', failed_count,
    'results', results
  );
END;
$$;