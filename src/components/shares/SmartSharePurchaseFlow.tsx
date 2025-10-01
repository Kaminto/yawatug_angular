
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrendingUp } from 'lucide-react';
import { useTransactionFees } from '@/hooks/useTransactionFees';
import { useSmartPayment } from '@/hooks/useSmartPayment';

interface SmartSharePurchaseFlowProps {
  shares: any;
  userProfile: any;
  userId: string;
  userWallets: any[];
  onPurchaseComplete: () => void;
}

const SmartSharePurchaseFlow: React.FC<SmartSharePurchaseFlowProps> = ({
  shares,
  userProfile,
  userId,
  userWallets,
  onPurchaseComplete
}) => {
  const [quantity, setQuantity] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [loading, setLoading] = useState(false);
  const { calculateFee } = useTransactionFees();
  const { findBestPaymentMethod, processExchangeAndPayment } = useSmartPayment();

  const purchaseQuantity = parseInt(quantity) || 0;
  const totalAmount = purchaseQuantity * shares.price_per_share;
  const selectedWallet = userWallets.find(w => w.id === selectedWalletId);
  const feeDetails = calculateFee('share_purchase', totalAmount, selectedWallet?.currency || 'UGX');

  const handlePurchase = async () => {
    if (!purchaseQuantity) {
      toast.error('Please enter quantity');
      return;
    }

    if (purchaseQuantity > shares.available_shares) {
      toast.error('Not enough shares available');
      return;
    }

    setLoading(true);
    try {
      // Use smart payment to find best payment method (preferring UGX)
      const paymentOptions = await findBestPaymentMethod(userId, totalAmount, 'UGX');
      
      if (paymentOptions.error) {
        toast.error(paymentOptions.error);
        setLoading(false);
        return;
      }

      if (paymentOptions.needsExchange) {
        // Process automatic exchange
        const exchangeSuccess = await processExchangeAndPayment(
          paymentOptions.sourceWallet,
          paymentOptions.wallet,
          paymentOptions.exchangeRequired,
          paymentOptions.exchangeRate
        );
        
        if (!exchangeSuccess) {
          setLoading(false);
          return;
        }
      }

      // Create share purchase order
      const { error } = await supabase
        .from('share_purchase_orders')
        .insert({
          user_id: userId,
          share_id: shares.id,
          quantity: purchaseQuantity,
          price_per_share: shares.price_per_share,
          total_amount: totalAmount,
          currency: 'UGX',
          payment_source: 'wallet',
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Share purchase order created successfully');
      setQuantity('');
      setSelectedWalletId('');
      onPurchaseComplete();
    } catch (error: any) {
      console.error('Error creating purchase order:', error);
      toast.error(`Failed to create purchase order: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Smart Share Purchase
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Quantity</Label>
          <Input
            type="number"
            placeholder="Enter quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
            max={shares.available_shares}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Available: {shares.available_shares.toLocaleString()} shares
          </p>
        </div>

        <div>
          <Label>Payment Wallet</Label>
          <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose payment wallet" />
            </SelectTrigger>
            <SelectContent>
              {userWallets.map((wallet) => (
                <SelectItem key={wallet.id} value={wallet.id}>
                  {wallet.currency} Wallet (Balance: {wallet.balance.toLocaleString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {purchaseQuantity > 0 && (
          <div className="bg-muted p-3 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Price per share:</span>
              <span>UGX {shares.price_per_share.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Quantity:</span>
              <span>{purchaseQuantity.toLocaleString()} shares</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>UGX {totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Transaction Fee ({feeDetails.percentage}% + {feeDetails.flatFee}):</span>
              <span>UGX {feeDetails.totalFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-medium border-t pt-2">
              <span>Total Amount:</span>
              <span>UGX {(totalAmount + feeDetails.totalFee).toLocaleString()}</span>
            </div>
          </div>
        )}

        <Button 
          onClick={handlePurchase} 
          className="w-full"
          disabled={loading || !purchaseQuantity || !selectedWallet || (selectedWallet && selectedWallet.balance < (totalAmount + feeDetails.totalFee))}
        >
          {loading ? 'Processing...' : 'Purchase Shares'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SmartSharePurchaseFlow;
