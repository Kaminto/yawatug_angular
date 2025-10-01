import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ShareHolding {
  name: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  currentValue: number;
  costBasis: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
}

export interface CapitalGainsData {
  // Unrealized gains/losses
  unrealizedGains: number;
  unrealizedGainsPercent: number;
  
  // Realized gains/losses
  realizedGains: number;
  realizedGainsPercent: number;
  
  // Portfolio metrics
  currentValue: number;
  costBasis: number;
  totalShares: number;
  avgCostPerShare: number;
  
  // Holdings breakdown
  holdings: ShareHolding[];
}

export const useCapitalGains = (userId: string, period: string) => {
  const [capitalGains, setCapitalGains] = useState<CapitalGainsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadCapitalGains();
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

  const loadCapitalGains = async () => {
    try {
      setLoading(true);
      const periodFilter = getPeriodFilter();

      // Load current holdings and share price
      const [userSharesResult, currentShareResult, salesResult] = await Promise.all([
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
          .from('shares')
          .select('price_per_share')
          .order('created_at', { ascending: false })
          .limit(1)
          .single(),

        // Get share sales for realized gains (if we had a share_sales table)
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .eq('transaction_type', 'share_sale')
          .gte('created_at', periodFilter)
      ]);

      const userShares = userSharesResult.data || [];
      const currentPrice = currentShareResult.data?.price_per_share || 0;
      const sales = salesResult.data || [];

      // Calculate current portfolio metrics
      let totalCurrentValue = 0;
      let totalCostBasis = 0;
      let totalShares = 0;

      const holdings: ShareHolding[] = userShares.map(share => {
        const quantity = share.quantity || 0;
        const purchasePrice = share.purchase_price_per_share || 0;
        const costBasis = quantity * purchasePrice;
        const currentValue = quantity * currentPrice;
        const unrealizedGain = currentValue - costBasis;
        const unrealizedGainPercent = costBasis > 0 ? (unrealizedGain / costBasis) * 100 : 0;

        totalCurrentValue += currentValue;
        totalCostBasis += costBasis;
        totalShares += quantity;

        return {
          name: share.shares?.name || 'Unknown Share',
          quantity,
          purchasePrice,
          currentPrice,
          currentValue,
          costBasis,
          unrealizedGain,
          unrealizedGainPercent
        };
      });

      // Calculate unrealized gains
      const unrealizedGains = totalCurrentValue - totalCostBasis;
      const unrealizedGainsPercent = totalCostBasis > 0 ? (unrealizedGains / totalCostBasis) * 100 : 0;

      // Calculate realized gains (simplified - would need proper share_sales table)
      const realizedGains = sales.reduce((sum, sale) => {
        // This is simplified - in reality we'd need to track cost basis of sold shares
        return sum + (sale.amount || 0);
      }, 0);
      
      const realizedGainsPercent = 0; // Would need more complex calculation

      const avgCostPerShare = totalShares > 0 ? totalCostBasis / totalShares : 0;

      const capitalGainsData: CapitalGainsData = {
        unrealizedGains,
        unrealizedGainsPercent,
        realizedGains,
        realizedGainsPercent,
        currentValue: totalCurrentValue,
        costBasis: totalCostBasis,
        totalShares,
        avgCostPerShare,
        holdings
      };

      setCapitalGains(capitalGainsData);

    } catch (error) {
      console.error('Error loading capital gains:', error);
      toast.error('Failed to load share performance data');
    } finally {
      setLoading(false);
    }
  };

  return {
    capitalGains,
    loading,
    refreshCapitalGains: loadCapitalGains
  };
};