import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useAutoApproval = () => {
  const [processing, setProcessing] = useState(false);

  const checkAutoApproval = async (userId?: string) => {
    setProcessing(true);
    try {
      // Get current user if no userId provided
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('No authenticated user found');
        }
        targetUserId = user.id;
      }

      console.log('Calling auto-approval function for user:', targetUserId);

      const { data, error } = await supabase.functions.invoke('auto-approve-profile', {
        body: { userId: targetUserId }
      });

      if (error) {
        console.error('Auto-approval function error:', error);
        throw error;
      }

      console.log('Auto-approval result:', data);

      if (data.statusUpdated) {
        toast.success(data.message);
      } else {
        toast.info(data.message);
      }

      return data;
    } catch (error) {
      console.error('Auto-approval error:', error);
      toast.error('Failed to process auto-approval');
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  return {
    checkAutoApproval,
    processing
  };
};