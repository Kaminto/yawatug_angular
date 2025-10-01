import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ShareHolding {
  id: string;
  share_id: string;
  quantity: number;
  source: 'direct' | 'progressive';
  purchase_price_per_share?: number;
  shares_data?: {
    id: string;
    name: string;
    price_per_share: number;
    currency: string;
  };
}

interface EnhancedShareOwnership {
  totalShares: number;
  directShares: number;
  progressiveShares: number;
  totalValue: number;
  holdings: ShareHolding[];
}

export const useEnhancedShareOwnership = (userId: string) => {
  const [shareOwnership, setShareOwnership] = useState<EnhancedShareOwnership>({
    totalShares: 0,
    directShares: 0,
    progressiveShares: 0,
    totalValue: 0,
    holdings: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const loadEnhancedOwnership = async () => {
      try {
        // Load direct share holdings
        const { data: directHoldings, error: directError } = await supabase
          .from('user_shares')
          .select(`
            id,
            share_id,
            quantity,
            purchase_price_per_share,
            shares:shares!inner (
              id,
              name,
              price_per_share,
              currency
            )
          `)
          .eq('user_id', userId);

        if (directError) {
          console.error('Error loading direct holdings:', directError);
        }

        // Load progressive share ownership from bookings
        const { data: progressiveHoldings, error: progressiveError } = await supabase
          .from('share_bookings')
          .select(`
            id,
            share_id,
            shares_owned_progressively,
            booked_price_per_share,
            shares:shares!inner (
              id,
              name,
              price_per_share,
              currency
            )
          `)
          .eq('user_id', userId)
          .gt('shares_owned_progressively', 0);

        if (progressiveError) {
          console.error('Error loading progressive holdings:', progressiveError);
        }

        // Combine and process holdings
        const holdings: ShareHolding[] = [];
        let directShares = 0;
        let progressiveShares = 0;
        let totalValue = 0;

        // Process direct holdings
        if (directHoldings) {
          directHoldings.forEach(holding => {
            const quantity = holding.quantity || 0;
            directShares += quantity;
            totalValue += quantity * (holding.shares?.price_per_share || 0);
            
            holdings.push({
              id: holding.id,
              share_id: holding.share_id,
              quantity,
              source: 'direct',
              purchase_price_per_share: holding.purchase_price_per_share,
              shares_data: holding.shares
            });
          });
        }

        // Process progressive holdings
        if (progressiveHoldings) {
          progressiveHoldings.forEach(booking => {
            const quantity = booking.shares_owned_progressively || 0;
            progressiveShares += quantity;
            totalValue += quantity * (booking.shares?.price_per_share || 0);
            
            holdings.push({
              id: booking.id,
              share_id: booking.share_id,
              quantity,
              source: 'progressive',
              purchase_price_per_share: booking.booked_price_per_share,
              shares_data: booking.shares
            });
          });
        }

        setShareOwnership({
          totalShares: directShares + progressiveShares,
          directShares,
          progressiveShares,
          totalValue,
          holdings
        });

      } catch (error) {
        console.error('Error loading enhanced share ownership:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEnhancedOwnership();
  }, [userId]);

  return {
    shareOwnership,
    loading,
    refreshOwnership: () => {
      setLoading(true);
      // Re-trigger the effect
      setShareOwnership(prev => ({ ...prev }));
    }
  };
};