
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ShareSelectionCardProps {
  holding: any;
  isSelected: boolean;
  onSelect: () => void;
  maxAllowedQuantity: number;
}

const ShareSelectionCard: React.FC<ShareSelectionCardProps> = ({
  holding,
  isSelected,
  onSelect,
  maxAllowedQuantity
}) => {
  const currentPrice = holding.shares?.price_per_share || 0;
  const currentValue = holding.quantity * currentPrice;
  const totalInvested = holding.total_invested || (holding.quantity * holding.average_buy_price);
  const profitLoss = currentValue - totalInvested;
  const profitLossPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
  const isProfit = profitLoss >= 0;

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected 
          ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200' 
          : 'hover:bg-gray-50 border-gray-200'
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-lg">{holding.shares?.name || 'Unknown Share'}</h3>
            <p className="text-sm text-muted-foreground">
              {holding.quantity.toLocaleString()} shares owned
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">UGX {currentPrice.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Current Price</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="font-semibold">UGX {currentValue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg. Buy Price</p>
            <p className="font-semibold">UGX {holding.average_buy_price.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isProfit ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <span className={`font-medium ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
              {isProfit ? '+' : ''}UGX {profitLoss.toLocaleString()}
            </span>
            <span className={`text-sm ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
              ({isProfit ? '+' : ''}{profitLossPercentage.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Badge variant={maxAllowedQuantity > 0 ? "default" : "secondary"}>
            Max Sellable: {Math.min(holding.quantity, maxAllowedQuantity).toLocaleString()}
          </Badge>
          {isSelected && (
            <Badge className="bg-blue-600">
              Selected
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ShareSelectionCard;
