
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, DollarSign, PieChart, RefreshCw, Eye, EyeOff } from 'lucide-react';
import PerformanceOptimizedSharesList from './PerformanceOptimizedSharesList';
import AdvancedPortfolioInsights from './AdvancedPortfolioInsights';
import AdvancedPortfolioCharts from './analytics/AdvancedPortfolioCharts';
import DividendProjectionCalculator from './analytics/DividendProjectionCalculator';
import PortfolioExportTools from './export/PortfolioExportTools';

interface UserPortfolioDashboardProps {
  userShares: any[];
  stats: {
    totalInvestment: number;
    currentValue: number;
    totalGainLoss: number;
    gainLossPercentage: number;
    totalShares: number;
  };
  sharePool: any;
  userId: string;
  onRefresh: () => void;
}

const UserPortfolioDashboard: React.FC<UserPortfolioDashboardProps> = ({
  userShares,
  stats,
  sharePool,
  userId,
  onRefresh
}) => {
  const [showValues, setShowValues] = React.useState(true);

  return (
    <div className="space-y-6">
      {/* Portfolio Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Portfolio Overview</h2>
          <p className="text-muted-foreground">Track your investment performance and holdings</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowValues(!showValues)}
            className="flex items-center gap-2"
          >
            {showValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showValues ? 'Hide' : 'Show'} Values
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Current Share Price Display */}
      {sharePool && (
        <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium opacity-90">Current Share Price</h3>
                <p className="text-3xl font-bold">
                  UGX {sharePool.price_per_share?.toLocaleString() || 'N/A'}
                </p>
                <p className="text-sm opacity-80">
                  {sharePool.available_shares?.toLocaleString() || 0} shares available
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-80">Total Pool</p>
                <p className="text-xl font-semibold">
                  {sharePool.total_shares?.toLocaleString() || 0} shares
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portfolio Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">24h Change</span>
                <Badge variant="outline" className="text-green-600">+2.3%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">7d Change</span>
                <Badge variant="outline" className="text-green-600">+5.7%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">30d Change</span>
                <Badge variant="outline" className="text-blue-600">+12.4%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Mining Shares</span>
                <span className="text-sm font-medium">100%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full w-full"></div>
              </div>
              <p className="text-xs text-muted-foreground">
                Diversified mining portfolio
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Risk Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Volatility</span>
                <Badge variant="outline">Low</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Beta</span>
                <span className="text-sm font-medium">0.85</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Sharpe Ratio</span>
                <span className="text-sm font-medium">1.24</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Analytics */}
      <AdvancedPortfolioCharts 
        userShares={userShares}
        sharePool={sharePool}
      />

      {/* Dividend Projections */}
      <DividendProjectionCalculator 
        userShares={userShares}
        sharePool={sharePool}
      />

      {/* Holdings List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <PerformanceOptimizedSharesList 
            userShares={userShares}
            showPerformance={true}
          />
        </div>
        <div>
          <AdvancedPortfolioInsights 
            userId={userId}
            userShares={userShares}
            currentSharePrice={sharePool?.price_per_share || 0}
          />
        </div>
      </div>

      {/* Export Tools */}
      <PortfolioExportTools 
        userShares={userShares}
        userId={userId}
      />
    </div>
  );
};

export default UserPortfolioDashboard;
