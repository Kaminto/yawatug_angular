import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  Target,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useCapitalGains } from '@/hooks/useCapitalGains';

interface SharePerformanceSectionProps {
  userId: string;
  period: string;
  showValues: boolean;
}

const SharePerformanceSection: React.FC<SharePerformanceSectionProps> = ({
  userId,
  period,
  showValues
}) => {
  const { capitalGains, loading } = useCapitalGains(userId, period);

  const formatCurrency = (amount: number, showSign = false) => {
    if (!showValues) return '••••••';
    const sign = showSign && amount > 0 ? '+' : '';
    return `${sign}UGX ${amount.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => {
    if (!showValues) return '••••';
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-20 bg-muted rounded"></div>
              <div className="h-20 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Share Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" />
            Share Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Expected Earnings (Unrealized) */}
            <Card className="border-blue-200 bg-blue-50/30 dark:bg-blue-900/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Expected Earnings</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Unrealized
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-blue-800 mb-1">
                  {formatCurrency(capitalGains?.unrealizedGains || 0, true)}
                </p>
                <p className="text-xs text-blue-600">
                  Current Value - Cost Basis
                </p>
                <div className="mt-3 flex items-center gap-2">
                  {capitalGains?.unrealizedGainsPercent >= 0 ? (
                    <ArrowUpRight className="w-3 h-3 text-green-500" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-red-500" />
                  )}
                  <span className={`text-sm ${capitalGains?.unrealizedGainsPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(capitalGains?.unrealizedGainsPercent || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Released Earnings (Realized) */}
            <Card className="border-green-200 bg-green-50/30 dark:bg-green-900/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Released Earnings</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Realized
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-green-800 mb-1">
                  {formatCurrency(capitalGains?.realizedGains || 0, true)}
                </p>
                <p className="text-xs text-green-600">
                  Gains from sold shares
                </p>
                <div className="mt-3 flex items-center gap-2">
                  {capitalGains?.realizedGainsPercent >= 0 ? (
                    <ArrowUpRight className="w-3 h-3 text-green-500" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-red-500" />
                  )}
                  <span className={`text-sm ${capitalGains?.realizedGainsPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(capitalGains?.realizedGainsPercent || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Breakdown */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Current Value</p>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(capitalGains?.currentValue || 0)}
              </p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Cost Basis</p>
              <p className="text-lg font-bold">
                {formatCurrency(capitalGains?.costBasis || 0)}
              </p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Shares</p>
              <p className="text-lg font-bold">
                {showValues ? (capitalGains?.totalShares || 0).toLocaleString() : '••••'}
              </p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Avg. Cost/Share</p>
              <p className="text-lg font-bold">
                {formatCurrency(capitalGains?.avgCostPerShare || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Share Holdings Breakdown */}
      {capitalGains?.holdings && capitalGains.holdings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Holdings Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {capitalGains.holdings.map((holding, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{holding.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {holding.quantity.toLocaleString()} shares @ {formatCurrency(holding.purchasePrice)}/share
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(holding.currentValue)}
                    </p>
                    <p className={`text-sm ${holding.unrealizedGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(holding.unrealizedGain, true)}
                    </p>
                  </div>
                  <div className="ml-4">
                    <Badge 
                      variant={holding.unrealizedGain >= 0 ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {formatPercentage(holding.unrealizedGainPercent)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted/20 rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Chart visualization coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SharePerformanceSection;