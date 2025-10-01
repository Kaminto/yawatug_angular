import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, TrendingDown, Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EnhancedBusinessSummaryProps {
  userId: string;
}

interface EarningsData {
  realized: {
    sell: { quantity: number; avgPrice: number; amount: number };
    dividends: number;
    referral: { shares: number; amount: number };
    agent: { transactions: number; amount: number };
    total: number;
  };
  unrealized: {
    shares: { quantity: number; avgPrice: number; amount: number };
    dividends: number;
    referral: { shares: number; amount: number };
    total: number;
  };
}

const EnhancedBusinessSummary: React.FC<EnhancedBusinessSummaryProps> = ({ userId }) => {
  const [realizedOpen, setRealizedOpen] = useState(false);
  const [unrealizedOpen, setUnrealizedOpen] = useState(false);
  const [earnings, setEarnings] = useState<EarningsData>({
    realized: {
      sell: { quantity: 0, avgPrice: 0, amount: 0 },
      dividends: 0,
      referral: { shares: 0, amount: 0 },
      agent: { transactions: 0, amount: 0 },
      total: 0
    },
    unrealized: {
      shares: { quantity: 0, avgPrice: 0, amount: 0 },
      dividends: 0,
      referral: { shares: 0, amount: 0 },
      total: 0
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadEarningsData();
    }
  }, [userId]);

  const loadEarningsData = async () => {
    try {
      setLoading(true);

      // Load realized earnings data
      const [sharesSoldRes, dividendsPaidRes, referralEarningsRes, agentEarningsRes] = await Promise.all([
        supabase
          .from('share_transactions')
          .select('quantity, price_per_share, total_amount')
          .eq('user_id', userId)
          .eq('transaction_type', 'sell')
          .eq('status', 'completed'),
        
        supabase
          .from('dividend_payments')
          .select('amount')
          .eq('user_id', userId)
          .eq('status', 'completed'),
        
        supabase
          .from('referral_commissions')
          .select('commission_amount')
          .eq('referrer_id', userId)
          .eq('status', 'paid'),
        
        supabase
          .from('agent_income_streams')
          .select('amount')
          .eq('agent_id', userId)
          .eq('payment_status', 'paid')
      ]);

      // Load unrealized earnings data with simpler approach
      const currentSharesRes = await supabase
        .from('user_shares')
        .select('quantity, purchase_price_per_share')
        .eq('user_id', userId);
      
      const declaredDividendsRes = await supabase
        .from('dividend_declarations')
        .select('id')
        .eq('status', 'approved');
      
      const pendingReferralsRes = await supabase
        .from('share_bookings')
        .select('quantity')
        .eq('status', 'active');

      // Process realized earnings
      const sharesSold = sharesSoldRes.data || [];
      const dividendsPaid = dividendsPaidRes.data || [];
      const referralEarnings = referralEarningsRes.data || [];
      const agentEarnings = agentEarningsRes.data || [];

      const realizedSell = sharesSold.reduce((acc, sale) => ({
        quantity: acc.quantity + (sale.quantity || 0),
        amount: acc.amount + (sale.total_amount || 0)
      }), { quantity: 0, amount: 0 });

      const realizedDividends = dividendsPaid.reduce((sum, div) => sum + (div.amount || 0), 0);

      const realizedReferral = referralEarnings.reduce((acc, ref) => ({
        shares: acc.shares + 1,
        amount: acc.amount + (ref.commission_amount || 0)
      }), { shares: 0, amount: 0 });

      const realizedAgent = {
        transactions: agentEarnings.length,
        amount: agentEarnings.reduce((sum, agent) => sum + (agent.amount || 0), 0)
      };

      // Process unrealized earnings
      const currentShares = currentSharesRes.data || [];
      const declaredDividends = declaredDividendsRes.data || [];
      const pendingReferrals = pendingReferralsRes.data || [];

      const currentSharePrice = 21200; // This should come from the share pricing system
      const unrealizedShares = currentShares.reduce((acc, share) => {
        const currentValue = (share.quantity || 0) * currentSharePrice;
        const costValue = (share.quantity || 0) * (share.purchase_price_per_share || 0);
        return {
          quantity: acc.quantity + (share.quantity || 0),
          amount: acc.amount + (currentValue - costValue)
        };
      }, { quantity: 0, amount: 0 });

      const unrealizedDividends = declaredDividends.length * 1000; // Placeholder estimate

      const unrealizedReferral = pendingReferrals.reduce((acc, booking) => ({
        shares: acc.shares + (booking.quantity || 0),
        amount: acc.amount + ((booking.quantity || 0) * 0.05 * currentSharePrice)
      }), { shares: 0, amount: 0 });

      setEarnings({
        realized: {
          sell: {
            quantity: realizedSell.quantity,
            avgPrice: realizedSell.quantity > 0 ? Math.round(realizedSell.amount / realizedSell.quantity) : 0,
            amount: realizedSell.amount
          },
          dividends: realizedDividends,
          referral: realizedReferral,
          agent: realizedAgent,
          total: realizedSell.amount + realizedDividends + realizedReferral.amount + realizedAgent.amount
        },
        unrealized: {
          shares: {
            quantity: unrealizedShares.quantity,
            avgPrice: currentSharePrice,
            amount: unrealizedShares.amount
          },
          dividends: unrealizedDividends,
          referral: unrealizedReferral,
          total: unrealizedShares.amount + unrealizedDividends + unrealizedReferral.amount
        }
      });

    } catch (error) {
      console.error('Error loading earnings data:', error);
      toast.error('Failed to load business summary');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="space-y-2">
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-16 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Realized Earnings */}
        <Collapsible open={realizedOpen} onOpenChange={setRealizedOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between p-4 h-auto"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100">
                  <TrendingDown className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Realized Earnings</h3>
                  <p className="text-sm text-muted-foreground">Completed transactions</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-green-600">
                  UGX {earnings.realized.total.toLocaleString()}
                </span>
                {realizedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            <div className="pl-4 border-l-2 border-green-200 space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium">Sell</p>
                  <p className="text-sm text-muted-foreground">
                    {earnings.realized.sell.quantity} shares @ UGX {earnings.realized.sell.avgPrice.toLocaleString()} (avg)
                  </p>
                </div>
                <p className="font-semibold text-green-600">
                  UGX +{earnings.realized.sell.amount.toLocaleString()}
                </p>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium">Dividends</p>
                  <p className="text-sm text-muted-foreground">Received</p>
                </div>
                <p className="font-semibold text-green-600">
                  UGX +{earnings.realized.dividends.toLocaleString()}
                </p>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium">Referral</p>
                  <p className="text-sm text-muted-foreground">
                    Paid for {earnings.realized.referral.shares} shares sold
                  </p>
                </div>
                <p className="font-semibold text-green-600">
                  UGX +{earnings.realized.referral.amount.toLocaleString()}
                </p>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium">Agent</p>
                  <p className="text-sm text-muted-foreground">
                    Commission for {earnings.realized.agent.transactions} transactions
                  </p>
                </div>
                <p className="font-semibold text-green-600">
                  UGX +{earnings.realized.agent.amount.toLocaleString()}
                </p>
              </div>
              
              <div className="border-t pt-3">
                <div className="flex justify-between items-center font-bold">
                  <p>Total:</p>
                  <p className="text-green-600">UGX +{earnings.realized.total.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Unrealized Earnings */}
        <Collapsible open={unrealizedOpen} onOpenChange={setUnrealizedOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between p-4 h-auto"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100">
                  <Gift className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Unrealized Earnings</h3>
                  <p className="text-sm text-muted-foreground">Potential earnings</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-blue-600">
                  UGX {earnings.unrealized.total.toLocaleString()}
                </span>
                {unrealizedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            <div className="pl-4 border-l-2 border-blue-200 space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium">Shares</p>
                  <p className="text-sm text-muted-foreground">
                    {earnings.unrealized.shares.quantity} shares @ UGX {earnings.unrealized.shares.avgPrice.toLocaleString()}
                  </p>
                </div>
                <p className="font-semibold text-blue-600">
                  UGX +{earnings.unrealized.shares.amount.toLocaleString()}
                </p>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium">Dividends</p>
                  <p className="text-sm text-muted-foreground">Declared but not paid</p>
                </div>
                <p className="font-semibold text-blue-600">
                  UGX +{earnings.unrealized.dividends.toLocaleString()}
                </p>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium">Referral</p>
                  <p className="text-sm text-muted-foreground">
                    {earnings.unrealized.referral.shares} shares bookings
                  </p>
                </div>
                <p className="font-semibold text-blue-600">
                  UGX +{earnings.unrealized.referral.amount.toLocaleString()}
                </p>
              </div>
              
              <div className="border-t pt-3">
                <div className="flex justify-between items-center font-bold">
                  <p>Total:</p>
                  <p className="text-blue-600">UGX +{earnings.unrealized.total.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default EnhancedBusinessSummary;