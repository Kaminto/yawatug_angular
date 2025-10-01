
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  ShoppingCart, 
  Wallet, 
  CreditCard, 
  Calendar, 
  DollarSign, 
  AlertTriangle,
  Shield,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useContextualData } from '@/hooks/useContextualData';
import { useContextualBuyingLimits } from '@/hooks/useContextualBuyingLimits';
import { useOptimisticUpdates } from '@/hooks/useOptimisticUpdates';

interface SharePool {
  id: string;
  name: string;
  price_per_share: number;
  currency: string;
  available_shares: number;
  total_shares: number;
  description?: string;
}

interface UserProfile {
  id: string;
  full_name?: string;
  account_type?: string;
  status?: string;
}

interface UserWallet {
  id: string;
  currency: string;
  balance: number;
  status: string;
}

interface ContextualSharePurchaseFlowProps {
  sharePool: SharePool;
  userProfile: UserProfile;
  userWallets: UserWallet[];
  onPurchaseComplete: () => void;
}

const ContextualSharePurchaseFlow: React.FC<ContextualSharePurchaseFlowProps> = ({
  sharePool,
  userProfile,
  userWallets,
  onPurchaseComplete
}) => {
  const [quantity, setQuantity] = useState(1);
  const [paymentType, setPaymentType] = useState<'full' | 'installment'>('full');
  const [downPaymentAmount, setDownPaymentAmount] = useState(0);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  const { isAdminMode, effectiveUserId } = useContextualData();
  const { limits, loading: limitsLoading } = useContextualBuyingLimits(userProfile?.account_type);
  const { optimisticSharePurchase, optimisticWalletUpdate } = useOptimisticUpdates();

  const totalAmount = quantity * sharePool.price_per_share;
  const requiredDownPayment = limits ? (totalAmount * limits.required_down_payment_percentage) / 100 : totalAmount * 0.3;
  const remainingAmount = totalAmount - (paymentType === 'installment' ? downPaymentAmount : totalAmount);

  // Find compatible wallet
  const compatibleWallet = userWallets.find(w => 
    w.currency === sharePool.currency && w.status === 'active'
  );

  useEffect(() => {
    if (compatibleWallet && !selectedWallet) {
      setSelectedWallet(compatibleWallet.id);
    }
  }, [compatibleWallet, selectedWallet]);

  useEffect(() => {
    if (paymentType === 'installment' && limits) {
      setDownPaymentAmount(requiredDownPayment);
    } else {
      setDownPaymentAmount(totalAmount);
    }
  }, [paymentType, totalAmount, requiredDownPayment, limits]);

  const canAffordPurchase = () => {
    if (!compatibleWallet) return false;
    const requiredAmount = paymentType === 'installment' ? downPaymentAmount : totalAmount;
    return compatibleWallet.balance >= requiredAmount;
  };

  const isWithinLimits = () => {
    if (!limits) return true;
    return totalAmount >= limits.min_buy_amount && totalAmount <= limits.max_buy_amount;
  };

  const handlePurchase = async () => {
    if (!effectiveUserId || !compatibleWallet || !limits) {
      toast.error('Missing required information for purchase');
      return;
    }

    if (!isWithinLimits()) {
      toast.error(`Purchase amount must be between ${limits.min_buy_amount} and ${limits.max_buy_amount} ${sharePool.currency}`);
      return;
    }

    if (!canAffordPurchase()) {
      toast.error('Insufficient wallet balance');
      return;
    }

    try {
      setLoading(true);

      if (paymentType === 'full') {
        // Full payment
        await optimisticSharePurchase(
          sharePool.id,
          quantity,
          sharePool.price_per_share,
          effectiveUserId
        );

        // Deduct from wallet
        await optimisticWalletUpdate(
          compatibleWallet.id,
          totalAmount,
          'subtract'
        );

        toast.success('Shares purchased successfully!');
      } else {
        // Installment payment - create booking
        const { error: bookingError } = await supabase
          .from('share_bookings')
          .insert({
            user_id: effectiveUserId,
            share_id: sharePool.id,
            quantity,
            total_amount: totalAmount,
            down_payment_amount: downPaymentAmount,
            remaining_amount: remainingAmount,
            booked_price_per_share: sharePool.price_per_share,
            currency: sharePool.currency,
            status: 'active',
            expires_at: new Date(Date.now() + (limits.credit_period_days * 24 * 60 * 60 * 1000)).toISOString()
          });

        if (bookingError) throw bookingError;

        // Deduct down payment from wallet
        await optimisticWalletUpdate(
          compatibleWallet.id,
          downPaymentAmount,
          'subtract'
        );

        toast.success(`Shares booked successfully! You have ${limits.credit_period_days} days to complete payment.`);
      }

      onPurchaseComplete();
      
      // Reset form
      setQuantity(1);
      setPaymentType('full');
      
    } catch (error: any) {
      console.error('Error purchasing shares:', error);
      toast.error(error.message || 'Failed to purchase shares');
    } finally {
      setLoading(false);
    }
  };

  if (limitsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Loading purchase options...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {isAdminMode && (
        <Alert className="border-blue-200 bg-blue-50">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You are purchasing shares as an administrator. Enhanced limits may apply.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Purchase {sharePool.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Share Information */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-sm text-muted-foreground">Price per Share</Label>
              <p className="text-lg font-semibold">{sharePool.currency} {sharePool.price_per_share.toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Available</Label>
              <p className="text-lg font-semibold">{sharePool.available_shares.toLocaleString()} shares</p>
            </div>
          </div>

          {/* Purchase Limits Display */}
          {limits && (
            <div className="p-4 border rounded-lg">
              <Label className="text-sm font-medium">Your Purchase Limits ({limits.account_type})</Label>
              <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Min: </span>
                  <span className="font-medium">{sharePool.currency} {limits.min_buy_amount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Max: </span>
                  <span className="font-medium">{sharePool.currency} {limits.max_buy_amount.toLocaleString()}</span>
                  {isAdminMode && <Badge variant="secondary" className="ml-1 text-xs">Enhanced</Badge>}
                </div>
              </div>
            </div>
          )}

          {/* Quantity Selection */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              max={sharePool.available_shares}
            />
            <p className="text-sm text-muted-foreground">
              Total: {sharePool.currency} {totalAmount.toLocaleString()}
            </p>
          </div>

          {/* Payment Type Selection */}
          <div className="space-y-4">
            <Label>Payment Option</Label>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={paymentType === 'full' ? 'default' : 'outline'}
                onClick={() => setPaymentType('full')}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <DollarSign className="h-5 w-5" />
                <span>Full Payment</span>
                <span className="text-xs opacity-70">Pay now</span>
              </Button>
              <Button
                variant={paymentType === 'installment' ? 'default' : 'outline'}
                onClick={() => setPaymentType('installment')}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <Calendar className="h-5 w-5" />
                <span>Installment</span>
                <span className="text-xs opacity-70">
                  {limits?.required_down_payment_percentage}% down
                </span>
              </Button>
            </div>
          </div>

          {/* Installment Details */}
          {paymentType === 'installment' && limits && (
            <div className="p-4 border rounded-lg space-y-3">
              <Label className="text-sm font-medium">Installment Plan</Label>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Down Payment ({limits.required_down_payment_percentage}%):</span>
                  <span className="font-medium">{sharePool.currency} {downPaymentAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining Amount:</span>
                  <span className="font-medium">{sharePool.currency} {remainingAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Period:</span>
                  <span className="font-medium">{limits.credit_period_days} days</span>
                </div>
              </div>
              <Progress value={(downPaymentAmount / totalAmount) * 100} className="h-2" />
            </div>
          )}

          {/* Wallet Selection */}
          {compatibleWallet ? (
            <div className="p-4 border rounded-lg">
              <Label className="text-sm font-medium">Payment Wallet</Label>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  <span>{compatibleWallet.currency} Wallet</span>
                </div>
                <div className="text-right">
                  <p className="font-medium">{compatibleWallet.currency} {compatibleWallet.balance.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Available</p>
                </div>
              </div>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No compatible {sharePool.currency} wallet found. Please ensure you have an active {sharePool.currency} wallet.
              </AlertDescription>
            </Alert>
          )}

          {/* Validation Messages */}
          {!isWithinLimits() && limits && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Purchase amount must be between {sharePool.currency} {limits.min_buy_amount.toLocaleString()} and {sharePool.currency} {limits.max_buy_amount.toLocaleString()}
              </AlertDescription>
            </Alert>
          )}

          {!canAffordPurchase() && compatibleWallet && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Insufficient balance. You need {sharePool.currency} {(paymentType === 'installment' ? downPaymentAmount : totalAmount).toLocaleString()} but only have {sharePool.currency} {compatibleWallet.balance.toLocaleString()}
              </AlertDescription>
            </Alert>
          )}

          {/* Purchase Button */}
          <Button
            onClick={handlePurchase}
            disabled={loading || !compatibleWallet || !isWithinLimits() || !canAffordPurchase()}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 animate-spin" />
                Processing...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {paymentType === 'full' ? 'Purchase Shares' : 'Book Shares'}
                <span className="ml-2">
                  {sharePool.currency} {(paymentType === 'installment' ? downPaymentAmount : totalAmount).toLocaleString()}
                </span>
              </div>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContextualSharePurchaseFlow;
