
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Users, Calendar, DollarSign, Package } from 'lucide-react';

interface EnhancedShareOverviewProps {
  shareData: any;
  marketActivity: any;
  bookingStats: any;
  reserveAllocations: any[];
}

const EnhancedShareOverview: React.FC<EnhancedShareOverviewProps> = ({
  shareData,
  marketActivity,
  bookingStats,
  reserveAllocations
}) => {
  if (!shareData) {
    return <div>Loading share data...</div>;
  }

  const soldShares = shareData.total_shares - shareData.available_shares - shareData.reserved_shares;
  const salesPercentage = (soldShares / shareData.total_shares) * 100;
  const reservePercentage = (shareData.reserved_shares / shareData.total_shares) * 100;

  const totalReserveUsed = reserveAllocations.reduce((sum, alloc) => sum + alloc.used_quantity, 0);
  const totalReserveAllocated = reserveAllocations.reduce((sum, alloc) => sum + alloc.allocated_quantity, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Market Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Market Overview</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="text-2xl font-bold">{shareData.currency} {shareData.price_per_share.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Current Share Price</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Shares:</span>
                <span>{shareData.total_shares.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Available:</span>
                <span className="text-green-600">{shareData.available_shares.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Reserved:</span>
                <span className="text-blue-600">{shareData.reserved_shares.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Sold:</span>
                <span className="text-orange-600">{soldShares.toLocaleString()}</span>
              </div>
            </div>
            <Progress value={salesPercentage} className="h-2" />
            <p className="text-xs text-center">{salesPercentage.toFixed(1)}% Sold</p>
          </div>
        </CardContent>
      </Card>

      {/* Reserve Allocation Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Reserve Status</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              {reserveAllocations.map((allocation) => (
                <div key={allocation.id} className="flex justify-between items-center">
                  <span className="text-sm capitalize">{allocation.reserve_type.replace('_', ' ')}</span>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {allocation.used_quantity}/{allocation.allocated_quantity}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {((allocation.used_quantity / allocation.allocated_quantity) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Total Used:</span>
                <span>{totalReserveUsed.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Total Allocated:</span>
                <span>{totalReserveAllocated.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Market Activity</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {marketActivity ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Buy/Sell Ratio:</span>
                  <Badge variant={marketActivity.buy_sell_ratio > 1 ? "default" : "destructive"}>
                    {marketActivity.buy_sell_ratio.toFixed(2)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Buy Orders:</span>
                    <span className="text-green-600">{marketActivity.total_buy_orders}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Sell Orders:</span>
                    <span className="text-red-600">{marketActivity.total_sell_orders}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Buy Volume:</span>
                    <span>{marketActivity.total_buy_volume.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Sell Volume:</span>
                    <span>{marketActivity.total_sell_volume.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex justify-center">
                  <Badge variant="outline" className="capitalize">
                    {marketActivity.market_sentiment} Market
                  </Badge>
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground">
                No recent market activity
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Booking System Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Booking System</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bookingStats ? (
              <>
                <div>
                  <div className="text-2xl font-bold">{bookingStats.active_bookings}</div>
                  <p className="text-xs text-muted-foreground">Active Bookings</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Pending Amount:</span>
                    <span>{shareData.currency} {bookingStats.total_pending_amount?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Status:</span>
                    <Badge variant="outline">Active</Badge>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground">
                No active bookings
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pricing Mode */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pricing Control</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Mode:</span>
              <Badge variant={shareData.price_calculation_mode === 'auto' ? "default" : "secondary"}>
                {shareData.price_calculation_mode}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Buyback Mode:</span>
                <span className="capitalize">{shareData.buy_back_mode}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Buyback Fund:</span>
                <span>{shareData.currency} {shareData.buy_back_fund.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Health</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Liquidity:</span>
                <Badge variant="default">Good</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Price Floor:</span>
                <Badge variant="outline">UGX 20,000</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">FIFO Queue:</span>
                <Badge variant="default">Active</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedShareOverview;
