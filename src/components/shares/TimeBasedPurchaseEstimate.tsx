import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Clock, TrendingUp, DollarSign, Calendar } from 'lucide-react';

interface TimeBasedPurchaseEstimateProps {
  shareId: string;
  userId: string;
}

interface PurchaseEstimate {
  timeframe: string;
  icon: React.ReactNode;
  fundingRequired: number;
  sharesPossible: number;
  priceEstimate: number;
  description: string;
  bgColor: string;
}

const TimeBasedPurchaseEstimate: React.FC<TimeBasedPurchaseEstimateProps> = ({
  shareId,
  userId
}) => {
  const [estimates, setEstimates] = useState<PurchaseEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [userFunds, setUserFunds] = useState(0);

  useEffect(() => {
    loadEstimates();
  }, [shareId, userId]);

  const loadEstimates = async () => {
    try {
      setLoading(true);

      // Get current share price
      const { data: shareData } = await supabase
        .from('shares')
        .select('price_per_share')
        .eq('id', shareId)
        .single();

      const price = shareData?.price_per_share || 0;
      setCurrentPrice(price);

      // Get user's wallet balance
      const { data: walletData } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .eq('currency', 'UGX')
        .single();

      const funds = walletData?.balance || 0;
      setUserFunds(funds);

      // Calculate price drop scenarios and time-based estimates
      const baseEstimates: PurchaseEstimate[] = [
        {
          timeframe: 'Instant',
          icon: <Clock className="h-4 w-4" />,
          fundingRequired: price,
          sharesPossible: Math.floor(funds / price),
          priceEstimate: price,
          description: 'At current market price',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20'
        },
        {
          timeframe: '7 Days',
          icon: <Calendar className="h-4 w-4" />,
          fundingRequired: price * 0.95, // 5% potential drop
          sharesPossible: Math.floor(funds / (price * 0.95)),
          priceEstimate: price * 0.95,
          description: 'Potential 5% price decline scenario',
          bgColor: 'bg-green-50 dark:bg-green-900/20'
        },
        {
          timeframe: '14 Days',
          icon: <TrendingUp className="h-4 w-4" />,
          fundingRequired: price * 0.90, // 10% potential drop
          sharesPossible: Math.floor(funds / (price * 0.90)),
          priceEstimate: price * 0.90,
          description: 'Potential 10% price decline scenario',
          bgColor: 'bg-emerald-50 dark:bg-emerald-900/20'
        },
        {
          timeframe: '30 Days',
          icon: <DollarSign className="h-4 w-4" />,
          fundingRequired: price * 0.85, // 15% potential drop
          sharesPossible: Math.floor(funds / (price * 0.85)),
          priceEstimate: price * 0.85,
          description: 'Potential 15% price decline scenario',
          bgColor: 'bg-teal-50 dark:bg-teal-900/20'
        }
      ];

      setEstimates(baseEstimates);
    } catch (error) {
      console.error('Error loading purchase estimates:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Purchase Possibilities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">Loading estimates...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Purchase Possibilities Based on Time & Funds
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Available funds: UGX {userFunds.toLocaleString()} | Current price: UGX {currentPrice.toLocaleString()}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {estimates.map((estimate, index) => (
          <div key={index} className={`p-3 rounded-lg ${estimate.bgColor}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {estimate.icon}
                <span className="font-medium">{estimate.timeframe}</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">
                  {estimate.sharesPossible.toLocaleString()} shares
                </div>
                <div className="text-xs text-muted-foreground">
                  @ UGX {estimate.priceEstimate.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {estimate.description}
            </div>
            {estimate.sharesPossible > 0 && (
              <div className="mt-2 pt-2 border-t border-current/20">
                <div className="flex justify-between text-xs">
                  <span>Total investment:</span>
                  <span>UGX {(estimate.sharesPossible * estimate.priceEstimate).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Remaining funds:</span>
                  <span>UGX {Math.max(0, userFunds - (estimate.sharesPossible * estimate.priceEstimate)).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        ))}
        
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <div className="text-xs text-amber-800 dark:text-amber-200">
            <strong>Note:</strong> These are projections based on potential market scenarios. 
            Actual prices may vary based on market conditions, demand, and other factors. 
            Price drops are not guaranteed and shares may appreciate instead.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimeBasedPurchaseEstimate;