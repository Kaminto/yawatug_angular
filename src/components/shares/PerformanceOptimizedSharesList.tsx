
import React, { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Share {
  id: string;
  shares?: {
    id: string;
    name: string;
    price_per_share: number;
    currency: string;
  };
  quantity: number;
  purchase_price_per_share: number;
}

interface PerformanceOptimizedSharesListProps {
  userShares: Share[];
  onShareSelect?: (share: Share) => void;
  showPerformance?: boolean;
}

const ShareItem = memo<{
  share: Share;
  onSelect?: (share: Share) => void;
  showPerformance?: boolean;
}>(({ share, onSelect, showPerformance = true }) => {
  const shareData = share.shares;
  if (!shareData) return null;

  const currentValue = share.quantity * shareData.price_per_share;
  const purchaseValue = share.quantity * share.purchase_price_per_share;
  const performance = currentValue - purchaseValue;
  const performancePercent = ((performance / purchaseValue) * 100);

  const isPositive = performance >= 0;

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4">
        <div>
          <h4 className="font-medium">{shareData.name}</h4>
          <p className="text-sm text-muted-foreground">
            {share.quantity.toLocaleString()} shares @ {shareData.currency} {shareData.price_per_share.toLocaleString()} each
          </p>
          {showPerformance && (
            <div className="flex items-center gap-1 mt-1">
              {isPositive ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{performance.toLocaleString()} ({performancePercent.toFixed(1)}%)
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium">
          {shareData.currency} {currentValue.toLocaleString()}
        </p>
        <Badge variant="outline">
          {share.quantity.toLocaleString()} shares
        </Badge>
        {onSelect && (
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => onSelect(share)}
          >
            Select
          </Button>
        )}
      </div>
    </div>
  );
});

ShareItem.displayName = 'ShareItem';

const PerformanceOptimizedSharesList: React.FC<PerformanceOptimizedSharesListProps> = ({
  userShares,
  onShareSelect,
  showPerformance = true
}) => {
  const memoizedShares = useMemo(() => userShares, [userShares]);

  const totalValue = useMemo(() => {
    return memoizedShares.reduce((total, share) => {
      if (!share.shares) return total;
      return total + (share.quantity * share.shares.price_per_share);
    }, 0);
  }, [memoizedShares]);

  const totalPerformance = useMemo(() => {
    const currentValue = memoizedShares.reduce((total, share) => {
      if (!share.shares) return total;
      return total + (share.quantity * share.shares.price_per_share);
    }, 0);
    
    const purchaseValue = memoizedShares.reduce((total, share) => {
      return total + (share.quantity * share.purchase_price_per_share);
    }, 0);
    
    return currentValue - purchaseValue;
  }, [memoizedShares]);

  if (memoizedShares.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">No shares found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Your Holdings</span>
          {showPerformance && (
            <div className="text-right">
              <div className="text-sm font-normal text-muted-foreground">Total Value</div>
              <div className="text-lg font-bold">UGX {totalValue.toLocaleString()}</div>
              <div className={`text-sm ${totalPerformance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalPerformance >= 0 ? '+' : ''}{totalPerformance.toLocaleString()}
              </div>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {memoizedShares.map((share) => (
          <ShareItem 
            key={share.id} 
            share={share} 
            onSelect={onShareSelect}
            showPerformance={showPerformance}
          />
        ))}
      </CardContent>
    </Card>
  );
};

export default memo(PerformanceOptimizedSharesList);
