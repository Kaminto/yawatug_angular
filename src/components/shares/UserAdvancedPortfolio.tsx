
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Eye, EyeOff, DollarSign, Calendar, BarChart3 } from 'lucide-react';

interface UserAdvancedPortfolioProps {
  userShares: any[];
  shares: any[];
  onPortfolioUpdate: () => Promise<void>;
}

const UserAdvancedPortfolio: React.FC<UserAdvancedPortfolioProps> = ({
  userShares,
  shares,
  onPortfolioUpdate
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [groupedView, setGroupedView] = useState(true);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getCurrentPrice = (shareId: string) => {
    const share = shares.find(s => s.id === shareId);
    return share?.price_per_share || 0;
  };

  const groupHoldingsByShare = () => {
    const grouped = userShares.reduce((acc, holding) => {
      if (!acc[holding.share_id]) {
        acc[holding.share_id] = {
          share_id: holding.share_id,
          share_name: holding.shares?.name,
          total_quantity: 0,
          total_cost: 0,
          holdings: []
        };
      }
      
      acc[holding.share_id].total_quantity += holding.quantity;
      acc[holding.share_id].total_cost += holding.quantity * holding.purchase_price;
      acc[holding.share_id].holdings.push(holding);
      
      return acc;
    }, {});

    return Object.values(grouped).map((group: any) => {
      const currentPrice = getCurrentPrice(group.share_id);
      const currentValue = group.total_quantity * currentPrice;
      const profitLoss = currentValue - group.total_cost;
      const profitLossPercent = group.total_cost > 0 ? (profitLoss / group.total_cost) * 100 : 0;
      const averagePrice = group.total_cost / group.total_quantity;

      return {
        ...group,
        average_price: averagePrice,
        current_price: currentPrice,
        current_value: currentValue,
        profit_loss: profitLoss,
        profit_loss_percent: profitLossPercent
      };
    });
  };

  const getIndividualHoldings = () => {
    return userShares.map(holding => {
      const currentPrice = getCurrentPrice(holding.share_id);
      const currentValue = holding.quantity * currentPrice;
      const purchaseValue = holding.quantity * holding.purchase_price;
      const profitLoss = currentValue - purchaseValue;
      const profitLossPercent = purchaseValue > 0 ? (profitLoss / purchaseValue) * 100 : 0;

      return {
        ...holding,
        current_price: currentPrice,
        current_value: currentValue,
        purchase_value: purchaseValue,
        profit_loss: profitLoss,
        profit_loss_percent: profitLossPercent
      };
    });
  };

  const portfolioData = groupedView ? groupHoldingsByShare() : getIndividualHoldings();
  const totalPortfolioValue = portfolioData.reduce((sum, item) => sum + item.current_value, 0);
  const totalInvested = portfolioData.reduce((sum, item) => 
    sum + (groupedView ? item.total_cost : item.purchase_value), 0
  );
  const totalProfitLoss = totalPortfolioValue - totalInvested;
  const totalProfitLossPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

  const getPerformanceColor = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getPerformanceIcon = (value: number) => {
    return value >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Portfolio Performance
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showDetails ? 'Hide' : 'Show'} Details
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGroupedView(!groupedView)}
              >
                {groupedView ? 'Individual' : 'Grouped'} View
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{formatCurrency(totalPortfolioValue)}</div>
              <div className="text-sm text-muted-foreground">Current Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatCurrency(totalInvested)}</div>
              <div className="text-sm text-muted-foreground">Total Invested</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getPerformanceColor(totalProfitLoss)}`}>
                {formatCurrency(Math.abs(totalProfitLoss))}
              </div>
              <div className="text-sm text-muted-foreground">
                {totalProfitLoss >= 0 ? 'Total Gain' : 'Total Loss'}
              </div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getPerformanceColor(totalProfitLoss)}`}>
                {totalProfitLoss >= 0 ? '+' : ''}{totalProfitLossPercent.toFixed(2)}%
              </div>
              <div className="text-sm text-muted-foreground">Return %</div>
            </div>
          </div>

          {totalProfitLoss !== 0 && (
            <Alert className={totalProfitLoss >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className={getPerformanceColor(totalProfitLoss)}>
                {getPerformanceIcon(totalProfitLoss)}
              </div>
              <AlertDescription className={getPerformanceColor(totalProfitLoss)}>
                Your portfolio has {totalProfitLoss >= 0 ? 'gained' : 'lost'} {formatCurrency(Math.abs(totalProfitLoss))} 
                ({Math.abs(totalProfitLossPercent).toFixed(2)}%) since your initial investments.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Holdings List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {groupedView ? 'Holdings by Share Type' : 'Individual Holdings (FIFO Order)'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {portfolioData.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500">No shares in portfolio</div>
            </div>
          ) : (
            <div className="space-y-4">
              {portfolioData.map((item, index) => (
                <div key={groupedView ? item.share_id : item.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">
                          {groupedView ? item.share_name : item.shares?.name}
                        </h3>
                        {!groupedView && (
                          <Badge variant="outline">
                            FIFO #{item.fifo_order || index + 1}
                          </Badge>
                        )}
                        {item.is_locked && (
                          <Badge variant="destructive">Locked</Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Quantity:</span>
                          <div className="font-medium">
                            {(groupedView ? item.total_quantity : item.quantity).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            {groupedView ? 'Avg Price:' : 'Purchase Price:'}
                          </span>
                          <div className="font-medium">
                            {formatCurrency(groupedView ? item.average_price : item.purchase_price)}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Current Price:</span>
                          <div className="font-medium">
                            {formatCurrency(item.current_price)}
                          </div>
                        </div>
                        {!groupedView && (
                          <div>
                            <span className="text-muted-foreground">Purchase Date:</span>
                            <div className="font-medium">
                              {new Date(item.purchase_date).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </div>

                      {showDetails && groupedView && item.holdings && (
                        <div className="mt-4 border-t pt-4">
                          <h4 className="text-sm font-semibold mb-2">Individual Holdings:</h4>
                          <div className="space-y-2">
                            {item.holdings.map((holding: any, idx: number) => (
                              <div key={holding.id} className="text-xs text-muted-foreground flex justify-between">
                                <span>
                                  #{idx + 1}: {holding.quantity} @ {formatCurrency(holding.purchase_price)}
                                  {holding.is_locked && <span className="text-red-600 ml-1">(Locked)</span>}
                                </span>
                                <span>{new Date(holding.purchase_date).toLocaleDateString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="font-semibold text-lg mb-1">
                        {formatCurrency(item.current_value)}
                      </div>
                      <div className={`flex items-center gap-1 ${getPerformanceColor(item.profit_loss)}`}>
                        {getPerformanceIcon(item.profit_loss)}
                        <span className="font-medium">
                          {item.profit_loss >= 0 ? '+' : ''}{formatCurrency(item.profit_loss)}
                        </span>
                      </div>
                      <div className={`text-sm ${getPerformanceColor(item.profit_loss)}`}>
                        ({item.profit_loss >= 0 ? '+' : ''}{item.profit_loss_percent.toFixed(2)}%)
                      </div>
                      {!groupedView && item.source_type && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {item.source_type}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserAdvancedPortfolio;
