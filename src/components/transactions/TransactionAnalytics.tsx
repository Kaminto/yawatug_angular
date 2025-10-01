import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  PieChart
} from 'lucide-react';

interface TransactionAnalyticsProps {
  userId: string;
}

interface TransactionSummary {
  totalDeposits: number;
  totalWithdrawals: number;
  totalSharePurchases: number;
  transactionCount: number;
  avgTransactionSize: number;
  largestTransaction: number;
}

const TransactionAnalytics: React.FC<TransactionAnalyticsProps> = ({ userId }) => {
  const [summary, setSummary] = useState<TransactionSummary>({
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalSharePurchases: 0,
    transactionCount: 0,
    avgTransactionSize: 0,
    largestTransaction: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadAnalytics();
    }
  }, [userId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed');

      if (transactions) {
        const deposits = transactions
          .filter(t => t.transaction_type === 'deposit')
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const withdrawals = transactions
          .filter(t => t.transaction_type === 'withdraw')
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const sharePurchases = transactions
          .filter(t => t.transaction_type === 'share_purchase')
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const amounts = transactions.map(t => Math.abs(t.amount));
        const avgAmount = amounts.length > 0 
          ? amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length 
          : 0;
        const maxAmount = amounts.length > 0 ? Math.max(...amounts) : 0;

        setSummary({
          totalDeposits: deposits,
          totalWithdrawals: withdrawals,
          totalSharePurchases: sharePurchases,
          transactionCount: transactions.length,
          avgTransactionSize: avgAmount,
          largestTransaction: maxAmount
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const netFlow = summary.totalDeposits - summary.totalWithdrawals;
  const investmentRate = summary.totalDeposits > 0 
    ? (summary.totalSharePurchases / summary.totalDeposits) * 100 
    : 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-24 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-accent/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-accent/10">
            <PieChart className="h-5 w-5 text-accent" />
          </div>
          <div>
            <CardTitle className="text-lg">Transaction Analytics</CardTitle>
            <CardDescription className="text-xs">Your financial activity overview</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3 mt-4">
            {/* Transaction Counts */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border bg-card">
                <p className="text-xs text-muted-foreground mb-1">Total Transactions</p>
                <p className="text-2xl font-bold">{summary.transactionCount}</p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <p className="text-xs text-muted-foreground mb-1">Avg Size</p>
                <p className="text-xl font-bold break-all">
                  UGX {summary.avgTransactionSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            {/* Money Flow */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Deposits</span>
                </div>
                <span className="font-bold text-green-700">
                  UGX {summary.totalDeposits.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Withdrawals</span>
                </div>
                <span className="font-bold text-red-700">
                  UGX {summary.totalWithdrawals.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Share Purchases</span>
                </div>
                <span className="font-bold text-primary">
                  UGX {summary.totalSharePurchases.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Net Flow */}
            <div className={`p-4 rounded-lg border ${netFlow >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Net Cash Flow</span>
                <div className="flex items-center gap-2">
                  {netFlow >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`font-bold ${netFlow >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {netFlow >= 0 ? '+' : ''}UGX {netFlow.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-3 mt-4">
            {/* Investment Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Investment Rate</span>
                <Badge variant="secondary">{investmentRate.toFixed(1)}%</Badge>
              </div>
              <Progress value={Math.min(investmentRate, 100)} className="h-2" />
              <p className="text-xs text-muted-foreground">
                You've invested {investmentRate.toFixed(1)}% of your total deposits in shares
              </p>
            </div>

            {/* Largest Transaction */}
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-xs text-muted-foreground mb-1">Largest Transaction</p>
              <p className="text-xl font-bold">UGX {summary.largestTransaction.toLocaleString()}</p>
            </div>

            {/* Smart Insights */}
            <div className="space-y-2 pt-2 border-t">
              {investmentRate > 50 && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-green-700">
                    Great! You're actively investing more than half of your deposits.
                  </p>
                </div>
              )}
              
              {investmentRate < 20 && summary.totalDeposits > 0 && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/10">
                  <DollarSign className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-700">
                    Consider investing more of your deposits to grow your portfolio.
                  </p>
                </div>
              )}

              {summary.transactionCount >= 10 && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-purple-500/10">
                  <Badge variant="secondary" className="text-xs">Active Investor</Badge>
                  <p className="text-xs text-purple-700">
                    You've made {summary.transactionCount} transactions. Keep up the momentum!
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TransactionAnalytics;
