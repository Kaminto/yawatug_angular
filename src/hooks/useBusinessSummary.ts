import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type Period = '7d' | '30d' | '90d' | '1y' | 'all';

export interface BusinessSummaryData {
  totalRealised: number;
  totalExpected: number;
  portfolioRoi: number;
  activeStreams: number;
  
  // Breakdown by type
  shares: {
    expectedEarnings: number;
    realisedEarnings: number;
    currentValue: number;
    costBasis: number;
  };
  
  dividends: {
    expectedDividends: number;
    realisedDividends: number;
    totalDeclared: number;
  };
  
  referrals: {
    expectedCommission: number;
    realisedCommission: number;
    unpaidBookings: number;
  };
  
  agent: {
    totalCommissions: number;
    paidCommissions: number;
    pendingCommissions: number;
  };
}

export const useBusinessSummary = (userId: string, period: Period) => {
  const [summary, setSummary] = useState<BusinessSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadBusinessSummary();
    }
  }, [userId, period]);

  const getPeriodFilter = () => {
    const now = new Date();
    switch (period) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      case 'all':
      default:
        return '1970-01-01T00:00:00Z';
    }
  };

  const loadBusinessSummary = async () => {
    try {
      setLoading(true);
      const periodFilter = getPeriodFilter();

      // Load all data in parallel
      const [
        userSharesResult,
        shareBookingsResult,
        dividendPaymentsResult,
        dividendDeclarationsResult,
        transactionsResult,
        agentIncomeResult,
        currentSharePriceResult,
        referralEarningsResult
      ] = await Promise.all([
        // User shares for current holdings
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

        // Share bookings for progressive shares
        supabase
          .from('share_bookings')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', periodFilter),

        // Dividend payments (released)
        supabase
          .from('dividend_payments')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', periodFilter),

        // Dividend declarations (expected)
        supabase
          .from('dividend_declarations')
          .select('*')
          .gte('created_at', periodFilter),

        // Transactions for realized gains/losses
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .in('transaction_type', ['share_sale', 'share_purchase'])
          .gte('created_at', periodFilter),

        // Agent income streams
        supabase
          .from('agent_income_streams')
          .select('*')
          .eq('agent_id', userId)
          .gte('created_at', periodFilter),

        // Current share price for calculations
        supabase
          .from('shares')
          .select('price_per_share')
          .order('created_at', { ascending: false })
          .limit(1)
          .single(),

        // Get referral commissions for the user in the selected period
        supabase
          .from('referral_commissions')
          .select('*')
          .eq('referrer_id', userId)
          .gte('created_at', periodFilter)
      ]);

      // Calculate share performance
      const userShares = userSharesResult.data || [];
      const currentPrice = currentSharePriceResult.data?.price_per_share || 0;
      
      let shareExpected = 0;
      let shareRealised = 0;
      let currentValue = 0;
      let costBasis = 0;

      userShares.forEach(share => {
        const shareValue = share.quantity * currentPrice;
        const shareCost = share.quantity * share.purchase_price_per_share;
        
        currentValue += shareValue;
        costBasis += shareCost;
      });

      shareExpected = currentValue - costBasis; // Unrealized gains/losses

      // Calculate dividend data
      const dividendPayments = dividendPaymentsResult.data || [];
      const dividendDeclarations = dividendDeclarationsResult.data || [];
      
      const realisedDividends = dividendPayments.reduce((sum, payment) => 
        sum + (payment.amount || 0), 0
      );
      
      const expectedDividends = dividendDeclarations.reduce((sum, declaration) => {
        // Calculate expected dividends based on user's shares
        const userShareCount = userShares.reduce((total, share) => total + share.quantity, 0);
        return sum + (declaration.per_share_amount * userShareCount);
      }, 0) - realisedDividends;

      // Calculate referral data using actual database queries
      const referralEarnings = referralEarningsResult.data || [];
      
      // Calculate expected (pending) and realised (paid) referral earnings
      const expectedReferralCommission = referralEarnings
        .filter(earning => earning.status === 'pending')
        .reduce((sum, earning) => sum + (earning.commission_amount || 0), 0);

      const realisedReferralCommission = referralEarnings
        .filter(earning => earning.status === 'paid')
        .reduce((sum, earning) => sum + (earning.commission_amount || 0), 0);

      const unpaidReferralBookings = referralEarnings.filter(e => e.status === 'pending').length;

      // Calculate agent data
      const agentIncome = agentIncomeResult.data || [];
      const totalAgentCommissions = agentIncome.reduce((sum, income) => sum + income.amount, 0);
      const paidAgentCommissions = agentIncome
        .filter(income => income.payment_status === 'paid')
        .reduce((sum, income) => sum + income.amount, 0);
      const pendingAgentCommissions = totalAgentCommissions - paidAgentCommissions;

      // Calculate totals
      const totalRealised = shareRealised + realisedDividends + realisedReferralCommission + paidAgentCommissions;
      const totalExpected = shareExpected + expectedDividends + expectedReferralCommission + pendingAgentCommissions;
      
      const portfolioRoi = costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0;
      
      const activeStreams = [
        userShares.length > 0,
        dividendPayments.length > 0,
        expectedReferralCommission > 0 || realisedReferralCommission > 0,
        agentIncome.length > 0
      ].filter(Boolean).length;

      const summaryData: BusinessSummaryData = {
        totalRealised,
        totalExpected,
        portfolioRoi,
        activeStreams,
        shares: {
          expectedEarnings: shareExpected,
          realisedEarnings: shareRealised,
          currentValue,
          costBasis
        },
        dividends: {
          expectedDividends,
          realisedDividends,
          totalDeclared: expectedDividends + realisedDividends
        },
        referrals: {
          expectedCommission: expectedReferralCommission,
          realisedCommission: realisedReferralCommission,
          unpaidBookings: unpaidReferralBookings
        },
        agent: {
          totalCommissions: totalAgentCommissions,
          paidCommissions: paidAgentCommissions,
          pendingCommissions: pendingAgentCommissions
        }
      };

      setSummary(summaryData);

    } catch (error) {
      console.error('Error loading business summary:', error);
      toast.error('Failed to load business summary');
    } finally {
      setLoading(false);
    }
  };

  const refreshSummary = async () => {
    await loadBusinessSummary();
  };

  return {
    summary,
    loading,
    refreshSummary
  };
};