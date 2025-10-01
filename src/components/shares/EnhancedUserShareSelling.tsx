import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrendingDown, AlertTriangle, Info } from 'lucide-react';
import { useTransactionFees } from '@/hooks/useTransactionFees';
import { useEnhancedSellingLimitsV3 } from '@/hooks/useEnhancedSellingLimitsV3';
import { useSingleShareSystem } from '@/hooks/useSingleShareSystem';

import EnhancedUserHoldings, { EnhancedHolding } from './EnhancedUserHoldings';

interface UserShareSellingProps {
  userHoldings: any[];
  userId: string;
  onSellComplete: () => void;
}

const EnhancedUserShareSelling: React.FC<UserShareSellingProps> = ({
  userHoldings,
  userId,
  onSellComplete
}) => {
  const [selectedHolding, setSelectedHolding] = useState<EnhancedHolding | null>(null);
  const [sellQuantity, setSellQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const { getFeeDetails } = useTransactionFees();
  
  // Get user's account type for proper limits
  const [userAccountType, setUserAccountType] = useState<string>('individual');
  
  useEffect(() => {
    const getUserAccountType = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('account_type')
          .eq('id', userId)
          .single();
        setUserAccountType(data?.account_type || 'individual');
      } catch (error) {
        console.error('Error getting user account type:', error);
      }
    };
    
    if (userId) {
      getUserAccountType();
    }
  }, [userId]);

  const { 
    validateSelling, 
    getMaxAllowedQuantity, 
    getRemainingLimits,
    pendingSellQuantity,
    loading: limitsLoading 
  } = useEnhancedSellingLimitsV3(userId, userAccountType);
  
  const { shareData } = useSingleShareSystem();
  const currentPrice = shareData?.price_per_share || 0;


  const quantity = parseInt(sellQuantity) || 0;
  const sellValue = currentPrice > 0 ? currentPrice * quantity : 0;
  const feeDetails = getFeeDetails('share_sell', sellValue);
  
  // Get maximum allowed quantity based on selling limits
  const totalHoldings = selectedHolding ? selectedHolding.quantity : 0;
  const maxAllowedQuantity = getMaxAllowedQuantity(totalHoldings);
  const remainingLimits = getRemainingLimits(totalHoldings);

  const handleSell = async () => {
    if (!selectedHolding || !quantity) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (quantity > (selectedHolding.quantity || 0)) {
      toast.error('Sell quantity exceeds available shares');
      return;
    }

    // Progressive shares cannot be sold directly - only direct shares
    if (selectedHolding.source === 'progressive') {
      toast.error('Progressive shares from bookings cannot be sold until fully owned. Please complete your booking payments first.');
      return;
    }

    // Validate against selling limits
    const validation = validateSelling(quantity, totalHoldings);
    if (!validation.isValid) {
      toast.error(validation.reason || 'Validation failed');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Use the new submit_sell_order function
      const { data: orderId, error } = await supabase
        .rpc('submit_sell_order', {
          p_user_id: user.id,
          p_share_id: selectedHolding.share_id,
          p_quantity: quantity,
          p_order_type: 'market',
          p_requested_price: null
        });

      if (error) throw error;

      toast.success('Share sell order created successfully');
      setSelectedHolding(null);
      setSellQuantity('');
      onSellComplete();
    } catch (error: any) {
      console.error('Error creating sell order:', error);
      toast.error(`Failed to create sell order: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <EnhancedUserHoldings userId={userId}>
      {(enhancedHoldings, holdingsLoading, refreshHoldings) => (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-6 w-6" />
              Sell Shares
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Select Shares to Sell</Label>
              <Select value={selectedHolding?.id || ''} onValueChange={(value) => {
                const holding = enhancedHoldings.find(h => h.id === value);
                setSelectedHolding(holding || null);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose shares to sell" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border shadow-lg z-[9999] min-w-[200px]">
                  {enhancedHoldings.map((holding) => (
                    <SelectItem key={holding.id} value={holding.id}>
                      {holding.quantity || 0} shares ({holding.source}) @ UGX {currentPrice.toLocaleString()} each
                      {holding.source === 'progressive' && ' - Cannot sell until fully owned'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedHolding && (
              <div>
                <Label>Sell Quantity (max: {selectedHolding.quantity || 0})</Label>
                <Input
                  type="number"
                  placeholder="Enter quantity"
                  value={sellQuantity}
                  onChange={(e) => setSellQuantity(e.target.value)}
                  min="1"
                  max={Math.min(selectedHolding?.quantity || 0, maxAllowedQuantity)}
                  disabled={selectedHolding.source === 'progressive'}
                />
                <p className="text-sm text-muted-foreground">
                  Available for sale: {(Math.min(selectedHolding?.quantity || 0, maxAllowedQuantity)).toLocaleString()} shares
                  {pendingSellQuantity > 0 && ` (${pendingSellQuantity} shares in pending sell orders)`}
                  {selectedHolding.source === 'progressive' && ' (Progressive shares cannot be sold)'}
                </p>
              </div>
            )}

            {selectedHolding && quantity > 0 && selectedHolding.source === 'direct' && (
              <div className="space-y-3">
                <div className="bg-muted p-3 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Sell Value:</span>
                    <span>UGX {sellValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Processing Fee:</span>
                    <span className="text-red-600">UGX {(feeDetails?.totalFee || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium border-t pt-2">
                    <span>Net Amount:</span>
                    <span>UGX {(sellValue - (feeDetails?.totalFee || 0)).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {selectedHolding && selectedHolding.source === 'progressive' && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">Progressive Shares</span>
                </div>
                <p className="text-sm text-amber-700 mt-1">
                  These shares are from your booking payments and cannot be sold until you complete all payments. 
                  Please finish your booking to convert them to sellable shares.
                </p>
              </div>
            )}

            <Button 
              onClick={handleSell} 
              className="w-full bg-action-sell hover:bg-action-sell/90 text-white"
              disabled={loading || !selectedHolding || !quantity || selectedHolding.source === 'progressive'}
            >
              {loading ? 'Processing...' : 'Submit Sell Order'}
            </Button>
          </CardContent>
        </Card>
      )}
    </EnhancedUserHoldings>
  );
};

export default EnhancedUserShareSelling;