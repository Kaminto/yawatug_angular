
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrendingDown, AlertTriangle } from 'lucide-react';
import { useTransactionFees } from '@/hooks/useTransactionFees';

interface EnhancedShareSellingProps {
  userShares: any[];
  userId: string;
  onSellComplete: () => void;
}

const EnhancedShareSelling: React.FC<EnhancedShareSellingProps> = ({
  userShares,
  userId,
  onSellComplete
}) => {
  const [quantity, setQuantity] = useState('');
  const [selectedShareId, setSelectedShareId] = useState('');
  const [requestedPrice, setRequestedPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const { getFeeDetails } = useTransactionFees();

  const sellQuantity = parseInt(quantity) || 0;
  const pricePerShare = parseFloat(requestedPrice) || 0;
  const totalAmount = sellQuantity * pricePerShare;
  const selectedShare = userShares.find(s => s.id === selectedShareId);
  const feeDetails = getFeeDetails('share_selling', totalAmount, 'UGX');
  const netAmount = totalAmount - feeDetails.totalFee;

  const handleSell = async () => {
    if (!sellQuantity || !selectedShare || !pricePerShare) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (sellQuantity > selectedShare.quantity) {
      toast.error('Cannot sell more shares than you own');
      return;
    }

    if (feeDetails.totalFee > totalAmount) {
      toast.error('Transaction fees exceed the sale amount');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('share_buyback_orders')
        .insert({
          user_id: userId,
          share_id: selectedShare.share_id,
          quantity: sellQuantity,
          requested_price: pricePerShare,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Share sell order created successfully');
      setQuantity('');
      setSelectedShareId('');
      setRequestedPrice('');
      onSellComplete();
    } catch (error: any) {
      console.error('Error creating sell order:', error);
      toast.error(`Failed to create sell order: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5" />
          Enhanced Share Selling
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Select Shares to Sell</Label>
          <Select value={selectedShareId} onValueChange={setSelectedShareId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose shares to sell" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border shadow-lg z-[9999] min-w-[200px]">
              {userShares.map((share) => (
                <SelectItem key={share.id} value={share.id}>
                  {share.shares?.name} ({share.quantity} shares)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Quantity to Sell</Label>
          <Input
            type="number"
            placeholder="Enter quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
            max={selectedShare?.quantity || 0}
            onWheel={(e) => e.currentTarget.blur()}
          />
          {selectedShare && (
            <p className="text-sm text-muted-foreground mt-1">
              Available: {selectedShare.quantity.toLocaleString()} shares
            </p>
          )}
        </div>

        <div>
          <Label>Requested Price per Share (UGX)</Label>
          <Input
            type="number"
            placeholder="Enter price per share"
            value={requestedPrice}
            onChange={(e) => setRequestedPrice(e.target.value)}
            min="1"
            onWheel={(e) => e.currentTarget.blur()}
          />
        </div>

        {sellQuantity > 0 && pricePerShare > 0 && (
          <div className="bg-muted p-3 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Price per share:</span>
              <span>UGX {pricePerShare.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Quantity:</span>
              <span>{sellQuantity.toLocaleString()} shares</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Gross Amount:</span>
              <span>UGX {totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Transaction Fee ({feeDetails.percentage}% + {feeDetails.flatFee}):</span>
              <span>UGX {feeDetails.totalFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-medium border-t pt-2">
              <span>Net Amount:</span>
              <span>UGX {netAmount.toLocaleString()}</span>
            </div>
            
            {feeDetails.totalFee > totalAmount && (
              <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-700">
                  Transaction fees exceed sale amount
                </span>
              </div>
            )}
          </div>
        )}

        <Button 
          onClick={handleSell} 
          className="w-full"
          disabled={loading || !sellQuantity || !selectedShare || !pricePerShare || feeDetails.totalFee > totalAmount}
        >
          {loading ? 'Processing...' : 'Create Sell Order'}
        </Button>

        <div className="text-xs text-muted-foreground">
          <p>Note: Sell orders are subject to admin approval and FIFO processing.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedShareSelling;
