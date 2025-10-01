
import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMarketState } from '@/hooks/useMarketState';

interface ShareData {
  id: string;
  name: string;
  price_per_share: number;
  currency: string;
  available_shares: number;
  total_shares: number;
  reserved_shares?: number;
  reserve_rate_percent?: number;
  reserve_allocated_shares?: number;
  reserve_issued_shares?: number;
  calculated_sold_shares?: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface ShareDataContextType {
  shareData: ShareData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  marketState: any;
}

const ShareDataContext = createContext<ShareDataContextType | undefined>(undefined);

export const useShareData = () => {
  const context = useContext(ShareDataContext);
  if (!context) {
    throw new Error('useShareData must be used within a ShareDataManager');
  }
  return context;
};

interface ShareDataManagerProps {
  children: (data: ShareDataContextType) => ReactNode;
}

export const ShareDataManager: React.FC<ShareDataManagerProps> = ({ children }) => {
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { marketState, loading: marketLoading } = useMarketState();

  const loadShareData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the share record (available_shares is now maintained by triggers)
      const { data, error: shareError } = await supabase
        .from('shares')
        .select('*')
        .eq('name', 'Yawatu Comm shares')
        .single();

      if (shareError) {
        throw shareError;
      }

      // Get actual shares sold from user holdings for display purposes
      const { data: holdingsData, error: holdingsError } = await supabase
        .from('user_share_holdings')
        .select('quantity');

      let totalSharesSold = 0;
      if (!holdingsError && holdingsData) {
        totalSharesSold = holdingsData.reduce((total, holding) => total + holding.quantity, 0);
      }

      // Get reserve issued shares from share transactions
      const { data: issuedSharesData, error: issuedSharesError } = await supabase
        .from('share_transactions')
        .select('quantity')
        .eq('transaction_type', 'issue');

      let totalReserveIssued = 0;
      if (!issuedSharesError && issuedSharesData) {
        totalReserveIssued = issuedSharesData.reduce((total, transaction) => total + transaction.quantity, 0);
      }

      // Calculate reserve shares for display (actual available_shares from triggers)
      const reserveRate = data.reserve_rate_percent || 0;
      const calculatedReservedShares = Math.floor((data.total_shares * reserveRate) / 100);

      const updatedShareData = {
        ...data,
        // Use the trigger-maintained available_shares value
        available_shares: data.available_shares,
        reserve_allocated_shares: calculatedReservedShares,
        reserve_issued_shares: totalReserveIssued,
        // Add calculated sold shares for reference
        calculated_sold_shares: totalSharesSold
      };

      setShareData(updatedShareData);
    } catch (err: any) {
      console.error('Error loading share data:', err);
      setError(err.message);
      toast.error('Failed to load share data');
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    loadShareData();

    // Subscribe to shares table changes
    const sharesChannel = supabase
      .channel('shares-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shares'
        },
        (payload) => {
          console.log('Shares table changed:', payload);
          loadShareData();
        }
      )
      .subscribe();

    // Subscribe to user holdings changes
    const holdingsChannel = supabase
      .channel('holdings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_share_holdings'
        },
        (payload) => {
          console.log('Holdings changed:', payload);
          loadShareData();
        }
      )
      .subscribe();

    // Subscribe to share transactions changes
    const transactionsChannel = supabase
      .channel('share-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'share_transactions'
        },
        (payload) => {
          console.log('Share transactions changed:', payload);
          loadShareData();
        }
      )
      .subscribe();

    // Subscribe to transactions that affect shares
    const walletTransactionsChannel = supabase
      .channel('wallet-share-transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: 'transaction_type=eq.share_purchase'
        },
        (payload) => {
          console.log('Share purchase transaction changed:', payload);
          loadShareData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sharesChannel);
      supabase.removeChannel(holdingsChannel);
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(walletTransactionsChannel);
    };
  }, []);

  const refresh = () => {
    loadShareData();
  };

  const contextValue: ShareDataContextType = {
    shareData,
    loading: loading || marketLoading,
    error,
    refresh,
    marketState
  };

  return (
    <ShareDataContext.Provider value={contextValue}>
      {children(contextValue)}
    </ShareDataContext.Provider>
  );
};
