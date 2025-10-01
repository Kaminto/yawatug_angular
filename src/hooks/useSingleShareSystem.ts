import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SINGLE_SHARE_NAME = 'Yawatu Comm shares';

export const useSingleShareSystem = () => {
  const [shareData, setShareData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSingleShare();
  }, []);

  const loadSingleShare = async () => {
    try {
      setLoading(true);
      
      // First try to find the expected share name
      let { data, error } = await supabase
        .from('shares')
        .select('*')
        .eq('name', SINGLE_SHARE_NAME)
        .maybeSingle();

      // If not found, get the first available share
      if (!data && !error) {
        const { data: firstShare, error: firstError } = await supabase
          .from('shares')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        data = firstShare;
        error = firstError;
      }

      if (error) throw error;
      setShareData(data);
    } catch (error) {
      console.error('Error loading single share:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    shareData,
    loading,
    refreshShare: loadSingleShare,
    SINGLE_SHARE_NAME
  };
};