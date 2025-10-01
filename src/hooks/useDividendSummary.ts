import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DividendPayment {
  amount: number;
  paymentDate: string;
  sharesEligible: number;
}

export interface DividendDeclaration {
  declarationDate: string;
  expectedAmount: number;
  paymentDate?: string;
}

export interface DividendSummaryData {
  // Expected vs Realised
  expectedDividends: number;
  realisedDividends: number;
  
  // Totals and metrics
  totalDeclared: number;
  eligibleShares: number;
  avgPerShare: number;
  yieldPercent: number;
  
  // Counts
  pendingDeclarations: number;
  paidPayments: number;
  
  // Details
  recentPayments: DividendPayment[];
  upcomingDeclarations: DividendDeclaration[];
}

export const useDividendSummary = (userId: string, period: string) => {
  const [dividendSummary, setDividendSummary] = useState<DividendSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadDividendSummary();
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

  const loadDividendSummary = async () => {
    try {
      setLoading(true);
      const periodFilter = getPeriodFilter();

      const [
        userSharesResult,
        dividendPaymentsResult,
        dividendDeclarationsResult
      ] = await Promise.all([
        // Get user's current shares to calculate eligible dividends
        supabase
          .from('user_shares')
          .select('quantity, purchase_price_per_share')
          .eq('user_id', userId),

        // Get dividend payments (realised)
        supabase
          .from('dividend_payments')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', periodFilter)
          .order('created_at', { ascending: false }),

        // Get dividend declarations (expected)
        supabase
          .from('dividend_declarations')
          .select('*')
          .gte('declaration_date', periodFilter)
          .order('declaration_date', { ascending: false })
      ]);

      const userShares = userSharesResult.data || [];
      const dividendPayments = dividendPaymentsResult.data || [];
      const dividendDeclarations = dividendDeclarationsResult.data || [];

      // Calculate user's total eligible shares
      const eligibleShares = userShares.reduce((sum, share) => sum + (share.quantity || 0), 0);

      // Calculate realised dividends
      const realisedDividends = dividendPayments.reduce((sum, payment) => 
        sum + (payment.amount || 0), 0
      );

      // Calculate expected dividends from unpaid declarations
      const expectedDividends = dividendDeclarations
        .filter(declaration => declaration.status === 'declared' || declaration.status === 'pending')
        .reduce((sum, declaration) => {
          return sum + ((declaration.per_share_amount || 0) * eligibleShares);
        }, 0);

      const totalDeclared = expectedDividends + realisedDividends;
      
      // Calculate average per share and yield
      const totalInvestment = userShares.reduce((sum, share) => 
        sum + ((share.quantity || 0) * (share.purchase_price_per_share || 0)), 0
      );
      
      const avgPerShare = eligibleShares > 0 ? totalDeclared / eligibleShares : 0;
      const yieldPercent = totalInvestment > 0 ? (totalDeclared / totalInvestment) * 100 : 0;

      // Prepare recent payments
      const recentPayments: DividendPayment[] = dividendPayments.slice(0, 5).map(payment => ({
        amount: payment.amount || 0,
        paymentDate: payment.created_at,
        sharesEligible: payment.shares_owned || eligibleShares
      }));

      // Prepare upcoming declarations
      const upcomingDeclarations: DividendDeclaration[] = dividendDeclarations
        .filter(declaration => declaration.status === 'declared' || declaration.status === 'pending')
        .slice(0, 5)
        .map(declaration => ({
          declarationDate: declaration.declaration_date,
          expectedAmount: (declaration.per_share_amount || 0) * eligibleShares,
          paymentDate: declaration.payment_date
        }));

      const summaryData: DividendSummaryData = {
        expectedDividends,
        realisedDividends,
        totalDeclared,
        eligibleShares,
        avgPerShare,
        yieldPercent,
        pendingDeclarations: upcomingDeclarations.length,
        paidPayments: dividendPayments.length,
        recentPayments,
        upcomingDeclarations
      };

      setDividendSummary(summaryData);

    } catch (error) {
      console.error('Error loading dividend summary:', error);
      toast.error('Failed to load dividend data');
    } finally {
      setLoading(false);
    }
  };

  return {
    dividendSummary,
    loading,
    refreshDividendSummary: loadDividendSummary
  };
};