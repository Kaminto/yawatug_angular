import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface InvestmentHealthScoreProps {
  score: number;
  totalShares: number;
  portfolioValue: number;
  roi?: number;
}

const InvestmentHealthScore: React.FC<InvestmentHealthScoreProps> = ({ 
  score, 
  totalShares, 
  portfolioValue,
  roi = 0 
}) => {
  const getHealthStatus = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-500/10' };
    if (score >= 60) return { label: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-500/10' };
    if (score >= 40) return { label: 'Fair', color: 'text-orange-600', bgColor: 'bg-orange-500/10' };
    return { label: 'Needs Attention', color: 'text-red-600', bgColor: 'bg-red-500/10' };
  };

  const getROIIcon = (roi: number) => {
    if (roi > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (roi < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const status = getHealthStatus(score);

  return (
    <Card className="border-accent/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              Investment Health
            </CardTitle>
            <CardDescription className="text-xs">Portfolio performance overview</CardDescription>
          </div>
          <div className={`px-3 py-1 rounded-full ${status.bgColor}`}>
            <span className={`text-sm font-semibold ${status.color}`}>{status.label}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Health Score</span>
            <span className={`text-2xl font-bold ${status.color}`}>{score}%</span>
          </div>
          <Progress value={score} className="h-3" />
        </div>

        {/* Portfolio Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border bg-card">
            <p className="text-xs text-muted-foreground mb-1">Total Shares</p>
            <p className="text-xl font-bold">{totalShares.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <p className="text-xs text-muted-foreground mb-1">Portfolio Value</p>
            <p className="text-lg font-bold break-all">UGX {portfolioValue.toLocaleString()}</p>
          </div>
        </div>

        {/* ROI Display */}
        {roi !== 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg border bg-accent/5">
            <span className="text-sm font-medium">Return on Investment</span>
            <div className="flex items-center gap-2">
              {getROIIcon(roi)}
              <span className={`font-bold ${roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {roi > 0 ? '+' : ''}{roi.toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        {/* Quick Tips */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          {score < 60 && <p>💡 Tip: Increase your holdings to improve portfolio health</p>}
          {totalShares > 0 && totalShares < 10 && <p>💡 Tip: Diversify with at least 10 shares</p>}
          {totalShares === 0 && <p>💡 Tip: Start investing to build your portfolio</p>}
        </div>
      </CardContent>
    </Card>
  );
};

export default InvestmentHealthScore;
