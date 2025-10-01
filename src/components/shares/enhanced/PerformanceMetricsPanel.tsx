import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, DollarSign, Target, AlertCircle } from 'lucide-react';

interface PerformanceMetricsPanelProps {
  userShares: any[];
}

const PerformanceMetricsPanel: React.FC<PerformanceMetricsPanelProps> = ({ userShares }) => {
  const metrics = useMemo(() => {
    if (!userShares || userShares.length === 0) {
      return {
        totalShares: 0,
        totalCurrentValue: 0,
        totalInvested: 0,
        totalGainLoss: 0,
        totalROI: 0,
        bestPerformer: null,
        worstPerformer: null,
        holdings: []
      };
    }

    let totalShares = 0;
    let totalCurrentValue = 0;
    let totalInvested = 0;
    const holdings = [];

    for (const share of userShares) {
      if (!share.shares) continue;

      const quantity = share.quantity;
      const currentPrice = share.shares.price_per_share;
      const purchasePrice = share.purchase_price_per_share;
      
      const currentValue = quantity * currentPrice;
      const investedValue = quantity * purchasePrice;
      const gainLoss = currentValue - investedValue;
      const roi = investedValue > 0 ? (gainLoss / investedValue) * 100 : 0;

      totalShares += quantity;
      totalCurrentValue += currentValue;
      totalInvested += investedValue;

      holdings.push({
        id: share.id,
        name: share.shares.name,
        quantity,
        currentPrice,
        purchasePrice,
        currentValue,
        investedValue,
        gainLoss,
        roi
      });
    }

    const totalGainLoss = totalCurrentValue - totalInvested;
    const totalROI = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

    // Find best and worst performers
    const sortedByROI = holdings.sort((a, b) => b.roi - a.roi);
    const bestPerformer = sortedByROI[0] || null;
    const worstPerformer = sortedByROI[sortedByROI.length - 1] || null;

    return {
      totalShares,
      totalCurrentValue,
      totalInvested,
      totalGainLoss,
      totalROI,
      bestPerformer,
      worstPerformer,
      holdings
    };
  }, [userShares]);

  const getROIColor = (roi: number) => {
    if (roi > 10) return 'text-green-600 bg-green-100';
    if (roi > 0) return 'text-green-600 bg-green-50';
    if (roi > -5) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-100';
  };

  const getPerformanceIcon = (gainLoss: number) => {
    return gainLoss >= 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  if (metrics.totalShares === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No shares to analyze</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Performance */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Performance</span>
            <div className="flex items-center gap-2">
              {getPerformanceIcon(metrics.totalGainLoss)}
              <Badge className={getROIColor(metrics.totalROI)}>
                {metrics.totalROI >= 0 ? '+' : ''}{metrics.totalROI.toFixed(2)}%
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Invested</p>
              <p className="font-medium">UGX {metrics.totalInvested.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Current Value</p>
              <p className="font-medium">UGX {metrics.totalCurrentValue.toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Gain/Loss</span>
              <span className={`font-medium ${metrics.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.totalGainLoss >= 0 ? '+' : ''}UGX {metrics.totalGainLoss.toLocaleString()}
              </span>
            </div>
            <Progress 
              value={Math.abs(metrics.totalROI)} 
              className={`h-2 ${metrics.totalROI >= 0 ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}`}
            />
          </div>
        </div>

        {/* Best & Worst Performers */}
        {metrics.bestPerformer && metrics.worstPerformer && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Top Performers</h4>
            
            {/* Best Performer */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-green-800">Best: {metrics.bestPerformer.name}</p>
                <p className="text-xs text-green-600">
                  {metrics.bestPerformer.quantity.toLocaleString()} shares
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-600">
                  +{metrics.bestPerformer.roi.toFixed(2)}%
                </p>
                <p className="text-xs text-green-600">
                  +UGX {metrics.bestPerformer.gainLoss.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Worst Performer (only if different from best and actually negative) */}
            {metrics.worstPerformer.id !== metrics.bestPerformer.id && metrics.worstPerformer.roi < 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-red-800">Worst: {metrics.worstPerformer.name}</p>
                  <p className="text-xs text-red-600">
                    {metrics.worstPerformer.quantity.toLocaleString()} shares
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-600">
                    {metrics.worstPerformer.roi.toFixed(2)}%
                  </p>
                  <p className="text-xs text-red-600">
                    UGX {metrics.worstPerformer.gainLoss.toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Selling Recommendations */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Selling Insights</h4>
          <div className="text-xs text-muted-foreground space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-3 w-3" />
              <span>
                Consider selling {Math.round(metrics.totalShares * 0.1).toLocaleString()} shares 
                to lock in {metrics.totalROI > 0 ? 'gains' : 'reduce losses'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-3 w-3" />
              <span>
                Average sell price needed for 10% profit: UGX {((metrics.totalInvested * 1.1) / metrics.totalShares).toLocaleString()}
              </span>
            </div>
            {metrics.totalROI > 15 && (
              <div className="flex items-center gap-2 text-green-600">
                <TrendingUp className="h-3 w-3" />
                <span>Strong performance! Consider partial profit-taking.</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceMetricsPanel;