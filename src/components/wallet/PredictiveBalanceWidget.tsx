import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface PredictiveBalanceWidgetProps {
  currentBalance: number;
  currency: string;
  pendingDeposits?: number;
  pendingWithdrawals?: number;
  predictedBalance?: number;
}

const PredictiveBalanceWidget: React.FC<PredictiveBalanceWidgetProps> = ({
  currentBalance,
  currency,
  pendingDeposits = 0,
  pendingWithdrawals = 0,
  predictedBalance
}) => {
  const netPending = pendingDeposits - pendingWithdrawals;
  const estimatedBalance = currentBalance + netPending;
  const hasChanges = netPending !== 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          Balance Forecast
          {hasChanges && <Badge variant="secondary" className="text-xs">Active</Badge>}
        </CardTitle>
        <CardDescription className="text-xs">Including pending transactions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current Balance */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Current Balance</span>
          <span className="font-semibold">
            {currency} {currentBalance.toLocaleString()}
          </span>
        </div>

        {/* Pending Transactions */}
        {hasChanges && (
          <>
            {pendingDeposits > 0 && (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-muted-foreground">Pending Deposits</span>
                </div>
                <span className="font-medium text-green-600">
                  +{currency} {pendingDeposits.toLocaleString()}
                </span>
              </div>
            )}

            {pendingWithdrawals > 0 && (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-muted-foreground">Pending Withdrawals</span>
                </div>
                <span className="font-medium text-red-600">
                  -{currency} {pendingWithdrawals.toLocaleString()}
                </span>
              </div>
            )}

            <div className="h-px bg-border"></div>

            {/* Estimated Balance */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-accent/10 border border-accent/20">
              <span className="text-sm font-semibold text-accent">Estimated Balance</span>
              <span className="text-lg font-bold text-accent">
                {currency} {estimatedBalance.toLocaleString()}
              </span>
            </div>
          </>
        )}

        {/* Smart Insights */}
        {!hasChanges && currentBalance < 10000 && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-700">
              Low balance. Consider depositing funds to continue investing.
            </p>
          </div>
        )}

        {estimatedBalance > currentBalance * 1.5 && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-green-700">
              Great! Your balance will increase significantly once deposits clear.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PredictiveBalanceWidget;
