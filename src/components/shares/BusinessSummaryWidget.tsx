import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Gift, ChevronRight, ChevronDown } from 'lucide-react';
import { useReferralCommissions } from '@/hooks/useReferralCommissions';

interface BusinessSummaryWidgetProps {
  userId: string;
  userShares: any[];
  sharePool: any;
}

const BusinessSummaryWidget: React.FC<BusinessSummaryWidgetProps> = ({ 
  userId, 
  userShares,
  sharePool 
}) => {
  const [realizedEarnings, setRealizedEarnings] = useState(0);
  const [unrealizedEarnings, setUnrealizedEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedRealized, setExpandedRealized] = useState(false);
  const [expandedUnrealized, setExpandedUnrealized] = useState(false);
  
  // Detailed breakdown states
  const [realizedBreakdown, setRealizedBreakdown] = useState({
    sell: 0,
    sellShares: 0,
    dividends: 0,
    referral: 0,
    agent: 0
  });
  
  const [unrealizedBreakdown, setUnrealizedBreakdown] = useState({
    shares: 0,
    sharesCount: 0,
    sharesPrice: 0,
    dividends: 0,
    referral: 0,
    referralCount: 0
  });
  
  const { enhancedEarnings } = useReferralCommissions(userId);

  useEffect(() => {
    if (userId && enhancedEarnings) {
      loadBusinessSummary();
    }
  }, [userId, userShares, enhancedEarnings]);

  const loadBusinessSummary = async () => {
    try {
      setLoading(true);

      // 1. REALIZED EARNINGS - Sell transactions
      const { data: sellTransactions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('transaction_type', 'share_sale')
        .eq('status', 'completed');

      const sellEarnings = (sellTransactions || []).reduce(
        (sum, tx) => sum + Math.abs(tx.amount), 
        0
      );
      
      // Count sold shares from share_transactions
      const { data: soldShares } = await supabase
        .from('share_transactions')
        .select('quantity')
        .eq('user_id', userId)
        .in('transaction_type', ['sale', 'sell', 'share_sale'])
        .eq('status', 'completed');
        
      const sellSharesCount = (soldShares || []).reduce((sum, tx) => sum + tx.quantity, 0);

      // 2. REALIZED - Dividends paid
      const { data: dividendPayments } = await supabase
        .from('dividend_payments')
        .select('amount')
        .eq('user_id', userId)
        .eq('status', 'completed');

      const dividendEarnings = (dividendPayments || []).reduce((sum, payment) => sum + payment.amount, 0);

      // 3. REALIZED - Referral commissions (paid)
      const referralEarned = enhancedEarnings.directEarned + enhancedEarnings.installmentEarned;

      // 4. REALIZED - Agent commissions
      const { data: agentCommissions } = await supabase
        .from('agent_income_streams')
        .select('amount')
        .eq('agent_id', userId)
        .eq('payment_status', 'paid');

      const agentEarnings = (agentCommissions || []).reduce((sum, commission) => sum + commission.amount, 0);

      const totalRealized = sellEarnings + dividendEarnings + referralEarned + agentEarnings;

      setRealizedBreakdown({
        sell: sellEarnings,
        sellShares: sellSharesCount,
        dividends: dividendEarnings,
        referral: referralEarned,
        agent: agentEarnings
      });

      // 5. UNREALIZED - Capital gains from current holdings
      const totalShares = userShares.reduce((sum, share) => sum + share.quantity, 0);
      const currentSharePrice = sharePool?.price_per_share || 0;
      const totalInvestment = userShares.reduce(
        (sum, share) => sum + (share.quantity * share.purchase_price_per_share), 
        0
      );
      const currentValue = totalShares * currentSharePrice;
      const capitalGains = Math.max(0, currentValue - totalInvestment);

      // 6. UNREALIZED - Pending dividends
      const { data: pendingDividends } = await supabase
        .from('dividend_payments')
        .select('amount')
        .eq('user_id', userId)
        .in('status', ['pending', 'processing']);

      const pendingDividendAmount = (pendingDividends || []).reduce((sum, payment) => sum + payment.amount, 0);

      // 7. UNREALIZED - Expected referral commissions
      const expectedReferral = enhancedEarnings.totalExpected;
      const futureBookingsCount = enhancedEarnings.breakdown.expectedFromBookings.length;

      const totalUnrealized = capitalGains + pendingDividendAmount + expectedReferral;

      setUnrealizedBreakdown({
        shares: capitalGains,
        sharesCount: totalShares,
        sharesPrice: currentSharePrice,
        dividends: pendingDividendAmount,
        referral: expectedReferral,
        referralCount: futureBookingsCount
      });

      setRealizedEarnings(totalRealized);
      setUnrealizedEarnings(totalUnrealized);
    } catch (error) {
      console.error('Error loading business summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Business Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-muted rounded"></div>
            <div className="h-16 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Business Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Realized Earnings */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div 
            className="flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
            onClick={() => setExpandedRealized(!expandedRealized)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Realized Earnings</p>
                <p className="text-xs text-muted-foreground">Completed transactions</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-success">
                UGX {realizedEarnings.toLocaleString()}
              </p>
              {expandedRealized ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Realized Earnings Breakdown */}
          {expandedRealized && (
            <div className="p-4 space-y-2 bg-background border-t border-border">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Sell</p>
                  <p className="text-xs text-muted-foreground">
                    {realizedBreakdown.sellShares} shares @ UGX {realizedBreakdown.sellShares > 0 ? Math.round(realizedBreakdown.sell / realizedBreakdown.sellShares).toLocaleString() : 0} (avg)
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  UGX {realizedBreakdown.sell.toLocaleString()}
                </p>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Dividends</p>
                  <p className="text-xs text-muted-foreground">
                    {realizedBreakdown.dividends > 0 ? 'Paid' : 'Not paid'}
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  UGX {realizedBreakdown.dividends.toLocaleString()}
                </p>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Referral</p>
                  <p className="text-xs text-muted-foreground">
                    Paid commissions
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  UGX {realizedBreakdown.referral.toLocaleString()}
                </p>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Agent</p>
                  <p className="text-xs text-muted-foreground">
                    Commission earnings
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  UGX {realizedBreakdown.agent.toLocaleString()}
                </p>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-border mt-2 pt-3">
                <p className="text-sm font-bold text-foreground">Total:</p>
                <p className="text-base font-bold text-success">
                  UGX {realizedEarnings.toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Unrealized Earnings */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div 
            className="flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
            onClick={() => setExpandedUnrealized(!expandedUnrealized)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Gift className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Unrealized Earnings</p>
                <p className="text-xs text-muted-foreground">Potential earnings</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-primary">
                UGX {unrealizedEarnings.toLocaleString()}
              </p>
              {expandedUnrealized ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Unrealized Earnings Breakdown */}
          {expandedUnrealized && (
            <div className="p-4 space-y-2 bg-background border-t border-border">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Shares</p>
                  <p className="text-xs text-muted-foreground">
                    {unrealizedBreakdown.sharesCount} shares @ UGX {unrealizedBreakdown.sharesPrice.toLocaleString()}
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  UGX {unrealizedBreakdown.shares.toLocaleString()}
                </p>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Dividends</p>
                  <p className="text-xs text-muted-foreground">
                    {unrealizedBreakdown.dividends > 0 ? 'On-hand but not paid' : 'None pending'}
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  UGX {unrealizedBreakdown.dividends.toLocaleString()}
                </p>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Referral</p>
                  <p className="text-xs text-muted-foreground">
                    {unrealizedBreakdown.referralCount}x Future Bookings
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  UGX {unrealizedBreakdown.referral.toLocaleString()}
                </p>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-border mt-2 pt-3">
                <p className="text-sm font-bold text-foreground">Total:</p>
                <p className="text-base font-bold text-primary">
                  UGX {unrealizedEarnings.toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessSummaryWidget;
