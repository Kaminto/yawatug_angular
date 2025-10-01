
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePriceUpdateCoordinator } from './usePriceUpdateCoordinator';

export const useSharePricing = (shareId?: string) => {
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { updateTrigger } = usePriceUpdateCoordinator();

  useEffect(() => {
    if (shareId) {
      loadCurrentPrice();
    }
  }, [shareId, updateTrigger]);

  const loadCurrentPrice = async () => {
    try {
      setLoading(true);
      
      console.log('useSharePricing: Loading current price for shareId:', shareId);
      
      // Get the current price from the shares table (this is the admin-set price)
      const { data: shareData, error: shareError } = await supabase
        .from('shares')
        .select('price_per_share')
        .eq('id', shareId)
        .single();

      if (shareError) {
        console.error('useSharePricing: Error fetching share price:', shareError);
        throw shareError;
      }
      
      if (shareData) {
        console.log('useSharePricing: Fetched price:', shareData.price_per_share);
        setCurrentPrice(shareData.price_per_share);
      }
    } catch (error) {
      console.error('Error loading current share price:', error);
      toast.error('Failed to load current share price');
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
