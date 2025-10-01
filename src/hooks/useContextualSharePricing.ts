
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useContextualData } from './useContextualData';
import { usePriceUpdateCoordinator } from './usePriceUpdateCoordinator';

export const useContextualSharePricing = (shareId?: string) => {
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { isAdminMode } = useContextualData();
  const { updateTrigger } = usePriceUpdateCoordinator();

  useEffect(() => {
    if (shareId) {
      loadCurrentPrice();
    }
  }, [shareId, isAdminMode, updateTrigger]);

  const loadCurrentPrice = async () => {
    try {
      setLoading(true);
      
      console.log('useContextualSharePricing: Loading current price for shareId:', shareId, 'Admin mode:', isAdminMode);
      
      // Get the current price from the most recent share record
      const { data: shareData, error: shareError } = await supabase
        .from('shares')
        .select('price_per_share')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (shareError) {
        console.error('useContextualSharePricing: Error fetching share price:', shareError);
        throw shareError;
      }
      
      if (shareData) {
        // Use price_per_share as the current price
        const price = shareData.price_per_share;
        console.log('useContextualSharePricing: Fetched price:', price);
        setCurrentPrice(price);
      }
    } catch (error) {
      console.error('Error loading current share price:', error);
      if (!isAdminMode) {
        toast.error('Failed to load current share price');
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    currentPrice,
    loading,
    refreshPrice: loadCurrentPrice
  };
};
