import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface CompactSummaryProps {
  sharesValue: number;
  sharesROI: number;
  lastDividend: { amount: number; date: string };
  currentSharePrice: number;
}

export const CompactDashboardSummary: React.FC<CompactSummaryProps> = ({
  sharesValue,
  sharesROI,
  lastDividend,
  currentSharePrice
}) => {
  return (
    <div className="md:hidden">
      <Card className="elegant-card gold-gradient">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Portfolio Value */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Portfolio</span>
              </div>
              <div className="font-semibold text-sm text-foreground">
                {formatCurrency(sharesValue, 'UGX')}
              </div>
              <div className={`flex items-center justify-center gap-1 text-xs ${
                sharesROI >= 0 ? 'text-accent-green' : 'text-destructive'
              }`}>
                {sharesROI >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {sharesROI >= 0 ? '+' : ''}{sharesROI.toFixed(1)}%
              </div>
            </div>

            {/* Share Price */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="h-4 w-4 text-accent-blue" />
                <span className="text-xs text-muted-foreground">Share Price</span>
              </div>
              <div className="font-semibold text-sm text-foreground">
                {formatCurrency(currentSharePrice, 'UGX')}
              </div>
              <div className="text-xs text-muted-foreground">
                per share
              </div>
            </div>
          </div>

          {/* Last Dividend - Full Width */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-accent-green" />
                <span className="text-xs text-muted-foreground">Last Dividend</span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-sm text-foreground">
                  {formatCurrency(lastDividend.amount, 'UGX')}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(lastDividend.date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short'
                  })}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};