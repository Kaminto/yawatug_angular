import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EnhancedHolding {
  id: string;
  share_id: string;
  quantity: number;
  source: 'direct' | 'progressive';
  shares?: {
    id: string;
    name: string;
    price_per_share: number;
    currency: string;
  };
}

interface EnhancedUserHoldingsProps {
  userId: string;
  children: (holdings: EnhancedHolding[], loading: boolean, refreshHoldings: () => Promise<void>) => React.ReactNode;
}

const EnhancedUserHoldings: React.FC<EnhancedUserHoldingsProps> = ({
  userId,
  children
}) => {
  const [holdings, setHoldings] = useState<EnhancedHolding[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEnhancedHoldings = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);

      // Load direct shares from user_shares table
      const [userSharesResult, bookingsResult, sharePoolResult] = await Promise.all([
        supabase
          .from('user_shares')
          .select(`
            *,
            shares:share_id (
              id,
              name,
              price_per_share,
              currency
            )
          `)
          .eq('user_id', userId),
        supabase
          .from('share_bookings')
          .select('shares_owned_progressively, share_id')
          .eq('user_id', userId)
          .in('status', ['active', 'partially_paid', 'completed'])
          .gt('shares_owned_progressively', 0),
        supabase
          .from('shares')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      const combinedHoldings: EnhancedHolding[] = [];

      // Add direct holdings
      if (userSharesResult.data) {
        userSharesResult.data.forEach(holding => {
          combinedHoldings.push({
            id: holding.id,
            share_id: holding.share_id,
            quantity: holding.quantity,
            source: 'direct',
            shares: holding.shares
          });
        });
      }

      // Add progressive holdings if we have any progressive shares
      if (bookingsResult.data && bookingsResult.data.length > 0) {
        const totalProgressiveShares = bookingsResult.data.reduce(
          (sum, booking) => sum + (booking.shares_owned_progressively || 0), 0
        );

        if (totalProgressiveShares > 0) {
          // Use the share pool data for progressive holdings
          const sharePool = sharePoolResult.data;
          if (sharePool) {
            combinedHoldings.push({
              id: `progressive-${sharePool.id}`,
              share_id: sharePool.id,
              quantity: totalProgressiveShares,
              source: 'progressive',
              shares: {
                id: sharePool.id,
                name: sharePool.name,
                price_per_share: sharePool.price_per_share,
                currency: sharePool.currency
              }
            });
          }
        }
      }

      setHoldings(combinedHoldings);
      console.log('Enhanced holdings loaded:', {
        userId,
        totalHoldings: combinedHoldings.length,
        directHoldings: combinedHoldings.filter(h => h.source === 'direct').length,
        progressiveHoldings: combinedHoldings.filter(h => h.source === 'progressive').length,
        holdings: combinedHoldings
      });

    } catch (error) {
      console.error('Error loading enhanced holdings:', error);
      setHoldings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnhancedHoldings();

    // Realtime updates for holdings and transfer requests
    const channel = supabase
      .channel('enhanced-user-holdings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_shares', filter: `user_id=eq.${userId}` },
        () => {
          console.log('Realtime: user_shares changed, refreshing holdings...');
          loadEnhancedHoldings();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'share_transfer_requests', filter: `sender_id=eq.${userId}` },
        () => {
          console.log('Realtime: transfer request (sender) changed, refreshing holdings...');
          loadEnhancedHoldings();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'share_transfer_requests', filter: `recipient_id=eq.${userId}` },
        () => {
          console.log('Realtime: transfer request (recipient) changed, refreshing holdings...');
          loadEnhancedHoldings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const refreshHoldings = async () => {
    await loadEnhancedHoldings();
  };

  return <>{children(holdings, loading, refreshHoldings)}</>;
};

export default EnhancedUserHoldings;