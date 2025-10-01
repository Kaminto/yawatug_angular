
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useDemoData = () => {
  const [loading, setLoading] = useState(false);

  const generateDemoTransactions = async (userId: string, walletId: string) => {
    const demoTransactions = [
      {
        user_id: userId,
        wallet_id: walletId,
        amount: 500000,
        currency: 'UGX',
        transaction_type: 'deposit',
        status: 'completed',
        reference: 'DEMO_DEP_001',
        description: 'Initial deposit'
      },
      {
        user_id: userId,
        wallet_id: walletId,
        amount: -250000,
        currency: 'UGX',
        transaction_type: 'share_purchase',
        status: 'completed',
        reference: 'DEMO_SHARE_001',
        description: 'Share purchase - 10 shares @ 25,000 each'
      },
      {
        user_id: userId,
        wallet_id: walletId,
        amount: 100000,
        currency: 'UGX',
        transaction_type: 'deposit',
        status: 'completed',
        reference: 'DEMO_DEP_002',
        description: 'Top-up deposit'
      },
      {
        user_id: userId,
        wallet_id: walletId,
        amount: -75000,
        currency: 'UGX',
        transaction_type: 'withdraw',
        status: 'pending',
        reference: 'DEMO_WITH_001',
        description: 'Withdrawal request'
      }
    ];

    return supabase.from('transactions').insert(demoTransactions);
  };

  const generateDemoShareHoldings = async (userId: string) => {
    // First get or create a share
    let { data: share } = await supabase
      .from('shares')
      .select('id')
      .single();

    if (!share) {
      const { data: newShare } = await supabase
        .from('shares')
        .insert({
          name: 'Yawatu Ordinary Shares',
          price_per_share: 25000,
          currency: 'UGX',
          available_shares: 999990,
          total_shares: 1000000,
          description: 'Ordinary shares in Yawatu mining operations'
        })
        .select()
        .single();
      
      share = newShare;
    }

    if (share) {
      return supabase.from('user_share_holdings').upsert({
        user_id: userId,
        share_id: share.id,
        quantity: 10,
        average_buy_price: 25000,
        total_invested: 250000,
        unrealized_gains: 0,
        realized_gains: 0,
        purchase_price: 25000
      });
    }
  };

  const generateDemoWalletBalances = async (userId: string) => {
    return supabase.from('wallets').upsert([
      {
        user_id: userId,
        currency: 'UGX',
        balance: 275000, // 500k + 100k - 250k - 75k
        status: 'active'
      },  
      {
        user_id: userId,
        currency: 'USD', 
        balance: 150,
        status: 'active'
      }
    ]);
  };

  const generateDemoData = async (userId: string) => {
    setLoading(true);
    try {
      // Generate demo wallet balances
      await generateDemoWalletBalances(userId);

      // Get wallet ID for transactions
      const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', userId)
        .eq('currency', 'UGX')
        .single();

      if (wallet) {
        // Generate demo transactions
        await generateDemoTransactions(userId, wallet.id);
      }

      // Generate demo share holdings
      await generateDemoShareHoldings(userId);

      toast.success('Demo data generated successfully!');
    } catch (error) {
      console.error('Error generating demo data:', error);
      toast.error('Failed to generate demo data');
    } finally {
      setLoading(false);
    }
  };

  const clearDemoData = async (userId: string) => {
    setLoading(true);
    try {
      // Clear transactions
      await supabase
        .from('transactions')
        .delete()
        .eq('user_id', userId)
        .like('reference', 'DEMO_%');

      // Reset wallet balances
      await supabase
        .from('wallets')
        .update({ balance: 0 })
        .eq('user_id', userId);

      // Clear share holdings
      await supabase
        .from('user_share_holdings')
        .delete()
        .eq('user_id', userId);

      toast.success('Demo data cleared successfully!');
    } catch (error) {
      console.error('Error clearing demo data:', error);
      toast.error('Failed to clear demo data');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    generateDemoData,
    clearDemoData
  };
};
