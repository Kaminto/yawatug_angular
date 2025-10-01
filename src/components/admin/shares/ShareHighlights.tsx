import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, Clock, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ShareData {
  id: string;
  name: string;
  price_per_share: number;
  currency: string;
  available_shares: number;
  total_shares: number;
}

interface ShareHighlightsProps {
  shareData: ShareData | null;
  loading: boolean;
}

const ShareHighlights: React.FC<ShareHighlightsProps> = ({ shareData, loading }) => {
  // Mock data for today's sales and pending orders - these would come from API calls
  const todaySales = {
    value: 45680000, // UGX
    shares: 1523
  };

  const pendingOrders = {
    buying: 12,
    selling: 8,
    transfer: 3
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-UG').format(num);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Current Share Price */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Share Price</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {shareData ? formatCurrency(shareData.price_per_share) : 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground">
            Per share • {shareData?.currency || 'UGX'}
          </p>
        </CardContent>
      </Card>

      {/* Today's Sales */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(todaySales.value)}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatNumber(todaySales.shares)} shares sold
          </p>
        </CardContent>
      </Card>

      {/* Pending Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Buying:</span>
              <Badge variant="secondary">{pendingOrders.buying}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Selling:</span>
              <Badge variant="outline">{pendingOrders.selling}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Transfer:</span>
              <Badge variant="default">{pendingOrders.transfer}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShareHighlights;