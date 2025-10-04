import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useDividendSummary } from '@/hooks/useDividendSummary';
import { DollarSign, TrendingUp, Clock } from 'lucide-react';

interface SimplifiedDividendDashboardProps {
  userId: string;
  totalShares: number;
}

const SimplifiedDividendDashboard: React.FC<SimplifiedDividendDashboardProps> = ({ userId, totalShares }) => {
  const { dividendSummary, loading } = useDividendSummary(userId, 'all');

  if (loading) {
    return (
      <Card className="border-l-4 border-primary/20">
        <CardContent className="p-4 sm:p-6">
          <div className="animate-pulse space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="h-24 bg-muted rounded-lg"></div>
              <div className="h-24 bg-muted rounded-lg"></div>
              <div className="h-24 bg-muted rounded-lg"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const received = dividendSummary?.realisedDividends || 0;
  const expected = dividendSummary?.expectedDividends || 0;
  const roi = dividendSummary?.yieldPercent || 0;

  return (
    <Card className="border-l-4 border-primary">
      <CardContent className="p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Received Dividends */}
          <div className="flex flex-col p-4 rounded-lg bg-success/10 border border-success/20">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-success" />
              <p className="text-xs font-medium text-success uppercase tracking-wide">Received</p>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-foreground">
              {received.toLocaleString('en-UG', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">UGX</p>
          </div>

          {/* Expected Dividends */}
          <div className="flex flex-col p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium text-primary uppercase tracking-wide">Expected</p>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-foreground">
              {expected.toLocaleString('en-UG', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">UGX (pending)</p>
          </div>

          {/* ROI */}
          <div className="flex flex-col p-4 rounded-lg bg-accent/10 border border-accent/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              <p className="text-xs font-medium text-accent uppercase tracking-wide">ROI</p>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-foreground">
              {roi.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Yield</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimplifiedDividendDashboard;