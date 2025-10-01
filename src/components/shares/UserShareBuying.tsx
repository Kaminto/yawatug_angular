
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { DollarSign, AlertCircle } from 'lucide-react';
import { useSmartPayment } from '@/hooks/useSmartPayment';
import { useSharePurchaseHandler } from '@/hooks/useSharePurchaseHandler';

interface UserShareBuyingProps {
  sharePool: any;
  userProfile: any;
  userId: string;
  wallets: any[];
  onPurchaseComplete: () => Promise<void>;
}

const UserShareBuying: React.FC<UserShareBuyingProps> = ({
  sharePool,
  userProfile,
  userId,
  wallets,
  onPurchaseComplete
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { findBestPaymentMethod, processExchangeAndPayment } = useSmartPayment();
  const { loading, processSharePurchase } = useSharePurchaseHandler();

  // Only allow UGX purchases
  const ugxWallet = wallets.find(w => w.currency === 'UGX');
  const usdWallet = wallets.find(w => w.currency === 'USD');
  const totalAmount = quantity * sharePool.price_per_share;

  const handlePurchase = async () => {
    if (!ugxWallet) {
      toast.error('UGX wallet not found');
      return;
    }

    if (quantity < 1 || quantity > sharePool.available_shares) {
      toast.error('Invalid quantity');
      return;
    }

    // Use smart payment to check best payment method
    const paymentOptions = await findBestPaymentMethod(userId, totalAmount, 'UGX');
    
    if (paymentOptions.error) {
      toast.error(paymentOptions.error);
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
        return;
      }
    }

    setShowConfirmDialog(true);
  };

  const executePurchase = async () => {
    if (!ugxWallet) {
      toast.error('UGX wallet not found');
      return;
    }

    // Use the proper share purchase handler
    const result = await processSharePurchase(
      userId,
      sharePool.id,
      quantity,
      sharePool.price_per_share,
      'UGX',
      ugxWallet.id
    );

    if (result.success) {
      setShowConfirmDialog(false);
      setQuantity(1);
      await onPurchaseComplete();
    }
  };


  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Buy Shares (UGX Only)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-blue-700">
                Shares can only be purchased in UGX currency.
              </p>
            </div>
          </div>

          <div>
            <Label>Quantity</Label>
            <Input
              type="number"
              min="1"
              max={sharePool.available_shares}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Available: {sharePool.available_shares.toLocaleString()} shares
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span>UGX Wallet Balance:</span>
              <span className="font-medium">UGX {ugxWallet?.balance.toLocaleString() || 0}</span>
            </div>
            {usdWallet && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>USD Wallet Balance:</span>
                <span>USD {usdWallet.balance.toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span>Total Amount:</span>
              <Badge variant="secondary">
                UGX {totalAmount.toLocaleString()}
              </Badge>
            </div>
            {ugxWallet && ugxWallet.balance < totalAmount && (
              <div className="mt-2 text-sm text-red-600">
                Shortfall: UGX {(totalAmount - ugxWallet.balance).toLocaleString()}
              </div>
            )}
          </div>

          <Button 
            onClick={handlePurchase} 
            disabled={loading || quantity < 1}
            className="w-full"
          >
            {loading ? 'Processing...' : 'Buy Shares'}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="mx-4 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Confirm Share Purchase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Shares:</span>
                <span>{quantity.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Price per share:</span>
                <span>UGX {sharePool.price_per_share.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Total Amount:</span>
                <span>UGX {totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>New Balance:</span>
                <span>UGX {(ugxWallet?.balance - totalAmount).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={executePurchase} disabled={loading} className="flex-1">
                {loading ? 'Processing...' : 'Confirm Purchase'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
};

export default UserShareBuying;
