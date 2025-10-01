import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Minus, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { useTransactionFees } from '@/hooks/useTransactionFees';
import { useEnhancedSellingLimitsV3 } from '@/hooks/useEnhancedSellingLimitsV3';
import { useSingleShareSystem } from '@/hooks/useSingleShareSystem';

interface SimplifiedSellDialogProps {
  userShares: any[];
  userId: string;
  open: boolean;
  onClose: () => void;
  onSellComplete: () => void;
}

const SimplifiedSellDialog: React.FC<SimplifiedSellDialogProps> = ({
  userShares,
  userId,
  open,
  onClose,
  onSellComplete
}) => {
  const [quantity, setQuantity] = useState('');
  const [selectedShareId, setSelectedShareId] = useState('');
  const [loading, setLoading] = useState(false);
  const [queueData, setQueueData] = useState({
    nextPosition: 1,
    buybackPower: 'Moderate',
    estimatedDays: 5
  });

  const { getFeeDetails } = useTransactionFees();
  const { validateSelling, getMaxAllowedQuantity } = useEnhancedSellingLimitsV3(
    userId, 
    'individual'
  );
  const { shareData } = useSingleShareSystem();

  const sellQuantity = parseInt(quantity) || 0;
  const pricePerShare = shareData?.price_per_share || 0;
  const totalAmount = sellQuantity * pricePerShare;
  const selectedShare = userShares.find(s => s.id === selectedShareId);
  const feeDetails = getFeeDetails('share_sell', totalAmount, 'UGX');
  const netAmount = totalAmount - feeDetails.totalFee;

  const totalHoldings = userShares.reduce((sum, share) => sum + share.quantity, 0);
  const maxAllowed = getMaxAllowedQuantity(totalHoldings);
  const validation = validateSelling(sellQuantity, totalHoldings);

  useEffect(() => {
    if (open) {
      loadQueueData();
    }
  }, [open]);

  const loadQueueData = async () => {
    try {
      // Get current queue position
      const { data: queueOrders } = await supabase
        .from('share_sell_orders')
        .select('fifo_position')
        .eq('status', 'pending')
        .order('fifo_position', { ascending: false })
        .limit(1);

      const nextPosition = queueOrders?.[0]?.fifo_position ? queueOrders[0].fifo_position + 1 : 1;

      // Simple buyback power calculation
      const { data: buybackFund } = await supabase
        .from('admin_sub_wallets')
        .select('balance')
        .eq('wallet_type', 'share_buyback')
        .eq('currency', 'UGX')
        .single();

      const fundBalance = buybackFund?.balance || 0;
      let buybackPower = 'Low';
      let estimatedDays = 7;

      if (fundBalance > 5000000) {
        buybackPower = 'High';
        estimatedDays = 2;
      } else if (fundBalance > 2000000) {
        buybackPower = 'Moderate';
        estimatedDays = 5;
      }

      setQueueData({
        nextPosition,
        buybackPower,
        estimatedDays
      });
    } catch (error) {
      console.error('Error loading queue data:', error);
    }
  };

  const handleSell = async () => {
    if (!sellQuantity || !selectedShare) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!validation.isValid) {
      toast.error(validation.reason || 'Invalid sell quantity');
      return;
    }

    if (sellQuantity > selectedShare.quantity) {
      toast.error('Cannot sell more shares than you own');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('share_sell_orders')
        .insert({
          user_id: userId,
          share_id: selectedShare.share_id || selectedShare.shares?.id,
          quantity: sellQuantity,
          requested_price: pricePerShare,
          status: 'pending',
          fifo_position: queueData.nextPosition,
          original_quantity: sellQuantity,
          remaining_quantity: sellQuantity
        });

      if (error) throw error;

      toast.success('Sell order created successfully');
      setQuantity('');
      setSelectedShareId('');
      onSellComplete();
      onClose();
    } catch (error: any) {
      console.error('Error creating sell order:', error);
      toast.error(`Failed to create sell order: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Minus className="h-6 w-6" />
            Sell Shares
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Queue Status Card */}
          <Card className="border-l-4 border-orange-500">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Next Queue Position</span>
                <Badge variant="outline" className="font-bold">
                  #{queueData.nextPosition}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Buyback Power</span>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={queueData.buybackPower === 'High' ? 'default' : 
                            queueData.buybackPower === 'Moderate' ? 'secondary' : 'outline'}
                  >
                    {queueData.buybackPower}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    ~{queueData.estimatedDays} days
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Price</span>
                <span className="text-lg font-semibold text-primary">
                  UGX {pricePerShare.toLocaleString()}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Processing time based on current fund availability</span>
              </div>
            </CardContent>
          </Card>

          {/* Share Selection */}
          <div>
            <Label className="text-base font-medium">Select Shares to Sell</Label>
            <Select value={selectedShareId} onValueChange={setSelectedShareId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose shares to sell" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border shadow-lg z-[9999] min-w-[200px]">
                {userShares.map((share) => (
                  <SelectItem key={share.id} value={share.id}>
                    {share.shares?.name || 'Yawatu Shares'} ({share.quantity} shares)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity Input */}
          <div>
            <Label className="text-base font-medium">Sell Quantity</Label>
            <Input
              type="number"
              placeholder="Enter quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              max={selectedShare?.quantity || 0}
              className="text-sm"
            />
            {selectedShare && (
              <p className="text-sm text-muted-foreground mt-1">
                Available: {selectedShare.quantity.toLocaleString()} shares
                {maxAllowed < selectedShare.quantity && (
                  <span className="text-orange-600 ml-2">
                    (Max sellable: {maxAllowed.toLocaleString()})
                  </span>
                )}
              </p>
            )}
          </div>


          {/* Order Summary */}
          {sellQuantity > 0 && pricePerShare > 0 && (
            <div className="bg-muted p-3 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Quantity:</span>
                <span>{sellQuantity.toLocaleString()} shares</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Price per share:</span>
                <span>UGX {pricePerShare.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Gross Amount:</span>
                <span>UGX {totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Fees ({feeDetails.percentage}%):</span>
                <span>UGX {feeDetails.totalFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t pt-2">
                <span>Net Amount:</span>
                <span>UGX {netAmount.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {!validation.isValid && sellQuantity > 0 && (
            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{validation.reason}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSell} 
              className="flex-1 bg-action-sell hover:bg-action-sell/90 text-white"
              disabled={loading || !validation.isValid || !sellQuantity || !selectedShare}
            >
              {loading ? 'Processing...' : 'Create Sell Order'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Orders processed in FIFO order. Subject to admin approval.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SimplifiedSellDialog;