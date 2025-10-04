import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ReferralCredits {
  id: string;
  total_credits: number;
  available_credits: number;
  staked_credits: number;
  converted_credits: number;
  created_at: string;
  updated_at: string;
}

interface CreditTransaction {
  id: string;
  transaction_type: 'earned' | 'converted' | 'staked' | 'unstaked' | 'prize_won';
  amount: number;
  balance_after: number;
  source_type?: string;
  description?: string;
  created_at: string;
}

export const useReferralCredits = (userId: string) => {
  const [credits, setCredits] = useState<ReferralCredits | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const loadCredits = async () => {
      try {
        // Load credit balance
        const { data: creditData, error: creditError } = await supabase
          .from('referral_credits')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (creditError && creditError.code !== 'PGRST116') {
          console.error('Error loading credits:', creditError);
        } else {
          setCredits(creditData);
        }

        // Load credit transactions
        const { data: txData, error: txError } = await supabase
          .from('credit_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (txError) {
          console.error('Error loading credit transactions:', txError);
        } else {
          setTransactions((txData || []) as CreditTransaction[]);
        }
      } catch (error) {
        console.error('Error in loadCredits:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCredits();

    // Real-time subscription for credits
    const channel = supabase
      .channel('credit-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'referral_credits',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setCredits(payload.new as ReferralCredits);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'credit_transactions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setTransactions((prev) => [payload.new as CreditTransaction, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    credits,
    transactions,
    loading,
  };
};
