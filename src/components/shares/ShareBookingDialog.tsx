
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, DollarSign, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { ShareData, ShareBuyingLimits } from '@/interfaces/ShareInterfaces';
import { useSmartPayment } from '@/hooks/useSmartPayment';
import ShareBookingTerms from './ShareBookingTerms';

interface ShareBookingDialogProps {
  sharePool: ShareData;
  open: boolean;
  onClose: () => void;
  onBookingComplete: () => void;
  userId: string;
  userWallets: any[];
  currentPrice: number;
  accountLimits: ShareBuyingLimits | null;
  userSharesCount?: number;
}

const ShareBookingDialog: React.FC<ShareBookingDialogProps> = ({
  sharePool,
  open,
  onClose,
  onBookingComplete,
  userId,
  userWallets,
  currentPrice,
  accountLimits,
  userSharesCount = 0
}) => {
  // Calculate minimum order quantity using same logic as purchase flow
  const minBuyAmount = accountLimits?.min_buy_amount || 1;
  const minimumOrderQuantity = userSharesCount >= minBuyAmount ? 1 : Math.max(1, minBuyAmount - userSharesCount);
  
  const [quantity, setQuantity] = useState(minimumOrderQuantity);
  const [loading, setLoading] = useState(false);
  const [extensionRequested, setExtensionRequested] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { findBestPaymentMethod, processExchangeAndPayment } = useSmartPayment();

  // Find UGX wallet for display purposes
  const ugxWallet = userWallets.find(w => w.currency === 'UGX');

  const totalAmount = quantity * currentPrice;
  const downPaymentPercentage = accountLimits?.required_down_payment_percentage || 30;
  const downPaymentAmount = (totalAmount * downPaymentPercentage) / 100;
  const remainingAmount = totalAmount - downPaymentAmount;
  const creditPeriodDays = accountLimits?.credit_period_days || 30;

  const maxAllowedQuantity = accountLimits ? Math.min(
    Math.floor(accountLimits.max_buy_amount / currentPrice),
    sharePool.available_shares
  ) : sharePool.available_shares;

  const handleBooking = async () => {
    if (!termsAccepted) {
      toast.error('Please accept the terms and conditions to proceed');
      return;
    }

    if (quantity < minimumOrderQuantity || quantity > maxAllowedQuantity) {
      if (quantity < minimumOrderQuantity) {
        const errorMsg = userSharesCount >= minBuyAmount 
          ? `Minimum booking is 1 share` 
          : `Minimum booking is ${minimumOrderQuantity} shares (${minBuyAmount} minimum - ${userSharesCount} owned)`;
        toast.error(errorMsg);
      } else {
        toast.error('Quantity exceeds maximum allowed');
      }
      return;
    }

    setLoading(true);
    try {
      // Use smart payment to find best payment method for down payment
      const paymentOptions = await findBestPaymentMethod(userId, downPaymentAmount, 'UGX');
      
      if (paymentOptions.error) {
        toast.error(paymentOptions.error);
        setLoading(false);
        return;
      }

      if (paymentOptions.needsExchange) {
        // Process automatic exchange for down payment
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
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + creditPeriodDays);

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('share_bookings')
        .insert({
          user_id: userId,
          share_id: sharePool.id,
          quantity,
          total_amount: totalAmount,
          down_payment_amount: downPaymentAmount,
          remaining_amount: remainingAmount,
          booked_price_per_share: currentPrice,
          currency: 'UGX',
          expires_at: expiresAt.toISOString(),
          status: 'active'
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Deduct down payment from UGX wallet (after any exchange)
      const { data: updatedWallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .eq('currency', 'UGX')
        .single();

      if (!updatedWallet || updatedWallet.balance < downPaymentAmount) {
        throw new Error('Insufficient balance after currency exchange');
      }

      const { error: walletError } = await supabase
        .from('wallets')
        .update({ 
          balance: updatedWallet.balance - downPaymentAmount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('currency', 'UGX');

      if (walletError) throw walletError;

      // Record the payment
      const { error: paymentError } = await supabase
        .from('share_booking_payments')
        .insert({
          booking_id: booking.id,
          payment_amount: downPaymentAmount,
          payment_date: new Date().toISOString(),
          status: 'completed'
        });

      if (paymentError) throw paymentError;

      // Reserve shares temporarily
      const { error: reserveError } = await supabase
        .from('shares')
        .update({ 
          available_shares: sharePool.available_shares - quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', sharePool.id);

      if (reserveError) throw reserveError;

      toast.success('Share booking created successfully!');
      onBookingComplete();
      onClose();
    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast.error(error.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const requestExtension = async () => {
    try {
      // For now, just simulate the extension request since we need proper table setup
      setExtensionRequested(true);
      toast.success('Extension request would be submitted for admin review');
    } catch (error) {
      console.error('Error requesting extension:', error);
      toast.error('Failed to submit extension request');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-none m-0 p-0 flex flex-col sm:max-w-md sm:mx-2 sm:h-auto sm:max-h-[75vh] sm:m-4 sm:p-0">
        <DialogHeader className="px-3 pt-3 pb-2 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Calendar className="h-4 w-4" />
            Book Shares - Payment Plan
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-3 min-h-0">
          <div className="space-y-4 pb-4">
          <div className="bg-blue-50 p-2 rounded text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="font-medium">Installment Payment</span>
          </div>

          <div>
            <Label className="text-sm font-medium">Share Details</Label>
            <div className="p-2 bg-muted rounded space-y-1">
              <p className="font-medium text-sm">{sharePool.name}</p>
              <div className="grid grid-cols-2 gap-1 text-sm text-muted-foreground">
                <span>Price: UGX {currentPrice.toLocaleString()}</span>
                <span>Available: {sharePool.available_shares.toLocaleString()}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Max: {maxAllowedQuantity.toLocaleString()}
              </p>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Quantity</Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || minimumOrderQuantity)}
              min={minimumOrderQuantity}
              max={maxAllowedQuantity}
              className="text-sm h-10"
            />
            {userSharesCount < minBuyAmount && (
              <p className="text-sm text-muted-foreground">
                Min: {minimumOrderQuantity} ({minBuyAmount} min - {userSharesCount} owned)
              </p>
            )}
          </div>

          <div className="bg-blue-50 p-2 rounded space-y-1">
            <div className="flex justify-between text-sm">
              <span>Total:</span>
              <span className="font-medium">UGX {totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Down ({downPaymentPercentage}%):</span>
              <span className="font-medium text-blue-600">UGX {downPaymentAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Balance:</span>
              <span>UGX {remainingAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm items-center">
              <span>Period:</span>
              <Badge variant="outline" className="text-sm px-2 py-1">
                <Clock className="h-3 w-3 mr-1" />
                {creditPeriodDays}d
              </Badge>
            </div>
          </div>

          {ugxWallet && ugxWallet.balance < downPaymentAmount && (
            <div className="bg-yellow-50 border border-yellow-200 p-1.5 rounded text-xs flex items-start gap-1 sm:p-2 sm:text-sm">
              <AlertTriangle className="h-3 w-3 text-yellow-600 mt-0.5 flex-shrink-0 sm:h-4 sm:w-4" />
              <span className="text-yellow-800">Smart payment will exchange from other currencies</span>
            </div>
          )}

           <ShareBookingTerms 
             isAccepted={termsAccepted}
             onAcceptanceChange={setTermsAccepted}
             creditPeriodDays={creditPeriodDays}
           />

           {!extensionRequested && (
              <Button
                variant="outline"
                onClick={requestExtension}
                className="w-full h-7 text-xs sm:h-9 sm:text-sm"
              >
                <RefreshCw className="h-3 w-3 mr-1 sm:h-4 sm:w-4 sm:mr-2" />
                Request Extension
              </Button>
            )}

            {extensionRequested && (
              <div className="bg-green-50 border border-green-200 p-1.5 rounded text-xs flex items-center gap-1 sm:p-2 sm:text-sm">
                <Clock className="h-3 w-3 text-green-600 sm:h-4 sm:w-4" />
                <span className="text-green-800">Extension request submitted</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="px-2 py-2 flex-shrink-0 border-t bg-background mt-auto sm:px-3">
          <div className="flex gap-1.5 sm:gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 text-xs h-8 sm:text-sm sm:h-10">
              Cancel
            </Button>
            <Button 
              onClick={handleBooking}
              disabled={loading || !termsAccepted}
              className="flex-1 text-xs h-8 sm:text-sm sm:h-10"
            >
              {loading ? 'Processing...' : `Confirm`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareBookingDialog;
