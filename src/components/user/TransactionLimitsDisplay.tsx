
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTransactionLimits } from '@/hooks/useTransactionLimits';
import { Wallet, TrendingUp, TrendingDown, RefreshCw, AlertTriangle } from 'lucide-react';

interface TransactionLimitsDisplayProps {
  userId: string | null;
}

const TransactionLimitsDisplay: React.FC<TransactionLimitsDisplayProps> = ({ userId }) => {
  const { limits, usage, loading } = useTransactionLimits(userId);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Transaction Limits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">Loading limits...</div>
        </CardContent>
      </Card>
    );
  }

  const getUsagePercentage = (used: number, limit: number) => {
    return limit > 0 ? (used / limit) * 100 : 0;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const withdrawalLimits = limits.filter(l => l.transaction_type === 'withdrawal');
  const depositLimits = limits.filter(l => l.transaction_type === 'deposit');
  const transferLimits = limits.filter(l => l.transaction_type === 'transfer');

  const withdrawalUsage = usage['withdrawal'] || { daily_used: 0, weekly_used: 0, monthly_used: 0 };
  const depositUsage = usage['deposit'] || { daily_used: 0, weekly_used: 0, monthly_used: 0 };
  const transferUsage = usage['transfer'] || { daily_used: 0, weekly_used: 0, monthly_used: 0 };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Transaction Limits & Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Daily Limits */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Daily Limits</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Withdrawal Daily */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Withdrawals
                  </span>
                  <Badge variant="outline">
                    {withdrawalLimits[0]?.daily_limit.toLocaleString() || 0} UGX
                  </Badge>
                </div>
                <Progress 
                  value={getUsagePercentage(withdrawalUsage.daily_used, withdrawalLimits[0]?.daily_limit || 0)} 
                  className="h-2" 
                />
                <div className="text-xs text-muted-foreground">
                  Used: {withdrawalUsage.daily_used.toLocaleString()} UGX
                </div>
              </div>

              {/* Deposit Daily */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Deposits
                  </span>
                  <Badge variant="outline">
                    {depositLimits[0]?.daily_limit.toLocaleString() || 0} UGX
                  </Badge>
                </div>
                <Progress 
                  value={getUsagePercentage(depositUsage.daily_used, depositLimits[0]?.daily_limit || 0)} 
                  className="h-2" 
                />
                <div className="text-xs text-muted-foreground">
                  Used: {depositUsage.daily_used.toLocaleString()} UGX
                </div>
              </div>

              {/* Transfer Daily */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Transfers
                  </span>
                  <Badge variant="outline">
                    {transferLimits[0]?.daily_limit.toLocaleString() || 0} UGX
                  </Badge>
                </div>
                <Progress 
                  value={getUsagePercentage(transferUsage.daily_used, transferLimits[0]?.daily_limit || 0)} 
                  className="h-2" 
                />
                <div className="text-xs text-muted-foreground">
                  Used: {transferUsage.daily_used.toLocaleString()} UGX
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Limits */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Monthly Limits</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Withdrawal Monthly */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Withdrawals
                  </span>
                  <Badge variant="outline">
                    {withdrawalLimits[0]?.monthly_limit.toLocaleString() || 0} UGX
                  </Badge>
                </div>
                <Progress 
                  value={getUsagePercentage(withdrawalUsage.monthly_used, withdrawalLimits[0]?.monthly_limit || 0)} 
                  className="h-2" 
                />
                <div className="text-xs text-muted-foreground">
                  Used: {withdrawalUsage.monthly_used.toLocaleString()} UGX
                </div>
              </div>

              {/* Deposit Monthly */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Deposits
                  </span>
                  <Badge variant="outline">
                    {depositLimits[0]?.monthly_limit.toLocaleString() || 0} UGX
                  </Badge>
                </div>
                <Progress 
                  value={getUsagePercentage(depositUsage.monthly_used, depositLimits[0]?.monthly_limit || 0)} 
                  className="h-2" 
                />
                <div className="text-xs text-muted-foreground">
                  Used: {depositUsage.monthly_used.toLocaleString()} UGX
                </div>
              </div>

              {/* Transfer Monthly */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Transfers
                  </span>
                  <Badge variant="outline">
                    {transferLimits[0]?.monthly_limit.toLocaleString() || 0} UGX
                  </Badge>
                </div>
                <Progress 
                  value={getUsagePercentage(transferUsage.monthly_used, transferLimits[0]?.monthly_limit || 0)} 
                  className="h-2" 
                />
                <div className="text-xs text-muted-foreground">
                  Used: {transferUsage.monthly_used.toLocaleString()} UGX
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Amount Limits */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Transaction Amount Limits</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Minimum Transaction:</span>
                <Badge>{limits[0]?.min_amount.toLocaleString() || 0} UGX</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Maximum Transaction:</span>
                <Badge>{limits[0]?.max_amount.toLocaleString() || 0} UGX</Badge>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {(getUsagePercentage(withdrawalUsage.daily_used, withdrawalLimits[0]?.daily_limit || 0) >= 80 ||
            getUsagePercentage(withdrawalUsage.monthly_used, withdrawalLimits[0]?.monthly_limit || 0) >= 80) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You're approaching your withdrawal limits. Please plan your transactions accordingly.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionLimitsDisplay;
