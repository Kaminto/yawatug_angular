import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrendingUp, ShoppingCart, Calendar, DollarSign, AlertCircle, Repeat, RefreshCw } from 'lucide-react';
import { useTransactionFees } from '@/hooks/useTransactionFees';
import { useSharePurchaseHandler } from '@/hooks/useSharePurchaseHandler';
import { useSharePricing } from '@/hooks/useSharePricing';
import { useEnhancedBuyingLimits } from '@/hooks/useEnhancedBuyingLimits';
import { useSmartPayment } from '@/hooks/useSmartPayment';
import { ShareData } from '@/interfaces/ShareInterfaces';
import ShareBookingDialog from './ShareBookingDialog';
import { useUserSharesBalance } from '@/hooks/useUserSharesBalance';
interface EnhancedSharePurchaseFlowProps {
  sharePool: ShareData;
  userProfile: any;
  userId: string;
  userWallets: any[];
  onPurchaseComplete: () => void;
}
const EnhancedSharePurchaseFlow: React.FC<EnhancedSharePurchaseFlowProps> = ({
  sharePool,
  userProfile,
  userId,
  userWallets,
  onPurchaseComplete
}) => {
  // Early return if sharePool is not available
  if (!sharePool) {
    return <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Loading share information...
          </div>
        </CardContent>
      </Card>;
  }
  const [quantity, setQuantity] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showBookingConfirmation, setShowBookingConfirmation] = useState(false);
  const [purchaseMethod, setPurchaseMethod] = useState<'full' | 'booking'>('full');
  const [paymentMethod, setPaymentMethod] = useState<any>(null);
  const [userSharesCount, setUserSharesCount] = useState(0);
  const [pendingShares, setPendingShares] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const {
    getFeeDetails
  } = useTransactionFees();
  const {
    processSharePurchase,
    loading
  } = useSharePurchaseHandler();
  const {
    currentPrice,
    loading: priceLoading,
    refreshPrice
  } = useSharePricing(sharePool.id);
  const {
    limits,
    loading: limitsLoading,
    validatePurchase,
    calculateFees
  } = useEnhancedBuyingLimits(userProfile?.account_type || 'individual');
  const {
    findBestPaymentMethod,
    processExchangeAndPayment,
    loading: paymentLoading
  } = useSmartPayment();
  const { totalShares } = useUserSharesBalance(userId);

  // Keep local state in sync with unified hook
  useEffect(() => {
    setUserSharesCount(totalShares || 0);
  }, [totalShares]);

  // Memoized calculations for better performance
  const calculations = useMemo(() => {
    const purchaseQuantity = parseInt(quantity) || 0;
    const totalAmount = purchaseQuantity * currentPrice;
    const enhancedFees = calculateFees(totalAmount);
    const totalWithFees = totalAmount + enhancedFees.total;

    // Trade limits are already in share quantities, not monetary amounts
    const upperLimit = limits?.max_buy_amount || 0;
    const lowerLimit = limits?.min_buy_amount || 0;

    // Trade limits calculation: Available = min(pool_available, max_limit - owned_shares - pending_orders)
    const userAccountLimit = Math.max(0, upperLimit - userSharesCount - pendingShares);
    const availableSharesForUser = Math.min(sharePool.available_shares, userAccountLimit);
    const maxAllowedQuantity = availableSharesForUser;

    // Updated minimum order logic: if held shares >= min limit, allow any quantity (min 1), else (min_limit - shares_held) is required
    const minimumOrderQuantity = userSharesCount >= lowerLimit ? 1 : Math.max(1, lowerLimit - userSharesCount);
    return {
      purchaseQuantity,
      totalAmount,
      enhancedFees,
      totalWithFees,
      maxAllowedQuantity,
      minimumOrderQuantity
    };
  }, [quantity, currentPrice, calculateFees, limits, userSharesCount, pendingShares, sharePool.available_shares]);

  // Combined data loading function for better performance
  const loadAllUserData = useCallback(async () => {
    try {
      setDataLoading(true);
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;

      // Load all user data in parallel for optimal performance
      const [userSharesResult, bookingsResult, buyResult] = await Promise.all([supabase.from('user_shares').select('quantity').eq('user_id', user.id), supabase.from('share_bookings').select('quantity, shares_owned_progressively, status').eq('user_id', user.id).in('status', ['active', 'partially_paid', 'completed', 'pending']), supabase.from('share_transactions').select('quantity').eq('user_id', user.id).eq('transaction_type', 'buy').in('status', ['pending', 'processing'])]);

      // Use unified hook for total shares; no manual calculation here
      // setUserSharesCount is handled via the hook sync above

      // Process pending orders
      const bookingPendingShares = bookingsResult.data?.filter(booking => ['pending', 'active', 'partially_paid'].includes(booking.status))?.reduce((sum, booking) => {
        const ownedShares = booking.shares_owned_progressively || 0;
        const totalShares = booking.quantity || 0;
        return sum + Math.max(0, totalShares - ownedShares);
      }, 0) || 0;
      const buyShares = buyResult.data?.reduce((sum, order) => sum + (order.quantity || 0), 0) || 0;
      setPendingShares(bookingPendingShares + buyShares);
    } catch (error) {
      console.error('Error loading user data:', error);
      setUserSharesCount(0);
      setPendingShares(0);
    } finally {
      setDataLoading(false);
    }
  }, [userId]);

  // Debounced payment option check
  const checkPaymentOptions = useCallback(async (amount: number) => {
    if (amount <= 0) return;
    try {
      const paymentOption = await findBestPaymentMethod(userId, amount, 'UGX');
      setPaymentMethod(paymentOption);
    } catch (error) {
      console.error('Payment option check failed:', error);
    }
  }, [findBestPaymentMethod, userId]);
  useEffect(() => {
    refreshPrice();
    loadAllUserData();
  }, [sharePool.id, userId, loadAllUserData]);
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (calculations.purchaseQuantity > 0) {
        checkPaymentOptions(calculations.totalWithFees);
      }
    }, 300); // Debounce payment checks by 300ms

    return () => clearTimeout(timeoutId);
  }, [calculations.purchaseQuantity, calculations.totalWithFees, checkPaymentOptions]);
  const handlePurchaseSubmit = async () => {
    if (!calculations.purchaseQuantity) {
      toast.error('Please enter a valid quantity');
      return;
    }
    if (calculations.purchaseQuantity > calculations.maxAllowedQuantity) {
      toast.error(`Maximum allowed quantity is ${calculations.maxAllowedQuantity.toLocaleString()} shares`);
      return;
    }

    // Use enhanced validation
    const validation = validatePurchase && validatePurchase(calculations.purchaseQuantity, userSharesCount);
    if (validation && !validation.isValid) {
      toast.error(validation.reason || 'Purchase validation failed');
      return;
    }

    // CRITICAL: Always check payment options before proceeding
    try {
      const paymentOption = await findBestPaymentMethod(userId, calculations.totalWithFees, 'UGX');
      if (!paymentOption?.wallet) {
        toast.error('Insufficient funds across all wallets. Please top up your UGX or USD wallet.');
        return;
      }

      // Update payment method state
      setPaymentMethod(paymentOption);
      setShowConfirmation(true);
    } catch (error) {
      console.error('Payment method check failed:', error);
      toast.error('Failed to determine payment method. Please try again.');
    }
  };
  const handleBookingSubmit = async () => {
    if (!calculations.purchaseQuantity) {
      toast.error('Please enter a valid quantity');
      return;
    }
    if (calculations.purchaseQuantity > calculations.maxAllowedQuantity) {
      toast.error(`Maximum allowed quantity is ${calculations.maxAllowedQuantity.toLocaleString()} shares`);
      return;
    }

    // Use enhanced validation
    const validation = validatePurchase && validatePurchase(calculations.purchaseQuantity, userSharesCount);
    if (validation && !validation.isValid) {
      toast.error('Booking validation failed');
      return;
    }
    const downPaymentPercentage = limits?.required_down_payment_percentage || 30;
    const downPaymentAmount = calculations.totalAmount * downPaymentPercentage / 100;

    // Use smart payment to check if down payment can be made
    try {
      const paymentOption = await findBestPaymentMethod(userId, downPaymentAmount, 'UGX');
      if (!paymentOption?.wallet) {
        toast.error('Insufficient funds across all wallets for down payment. Please top up your UGX or USD wallet.');
        return;
      }
      setShowBookingConfirmation(true);
    } catch (error) {
      console.error('Payment method check failed:', error);
      toast.error('Failed to determine payment method for down payment. Please try again.');
    }
  };
  const confirmBooking = async () => {
    try {
      const downPaymentPercentage = limits?.required_down_payment_percentage || 30;
      const downPaymentAmount = calculations.totalAmount * downPaymentPercentage / 100;

      // Use smart payment to handle currency exchange for down payment
      const paymentOptions = await findBestPaymentMethod(userId, downPaymentAmount, 'UGX');
      if (!paymentOptions) {
        toast.error('Insufficient funds across all wallets');
        return;
      }
      if (paymentOptions.needsExchange) {
        // Process automatic exchange for down payment
        const exchangeSuccess = await processExchangeAndPayment(paymentOptions.sourceWallet, paymentOptions.targetWallet, paymentOptions.exchangeAmount, paymentOptions.exchangeRate);
        if (!exchangeSuccess) {
          return;
        }
      }
      const remainingAmount = calculations.totalAmount - downPaymentAmount;
      const creditPeriodDays = limits?.credit_period_days || 30;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + creditPeriodDays);

      // Get UGX wallet ID
      const { data: ugxWallet, error: walletFetchError } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', userId)
        .eq('currency', 'UGX')
        .single();

      if (walletFetchError || !ugxWallet) {
        throw new Error('UGX wallet not found');
      }

      if (ugxWallet.balance < downPaymentAmount) {
        throw new Error('Insufficient balance after currency exchange');
      }

      // Create booking
      const {
        data: booking,
        error: bookingError
      } = await supabase.from('share_bookings').insert({
        user_id: userId,
        share_id: sharePool.id,
        quantity: calculations.purchaseQuantity,
        total_amount: calculations.totalAmount,
        down_payment_amount: downPaymentAmount,
        remaining_amount: remainingAmount,
        booked_price_per_share: currentPrice,
        currency: 'UGX',
        expires_at: expiresAt.toISOString(),
        status: 'active'
      }).select().single();
      if (bookingError) throw bookingError;

      // Use database function to process booking payment (creates transaction record + deducts wallet)
      const { data: paymentResult, error: paymentProcessError } = await supabase.rpc('process_booking_payment', {
        p_booking_id: booking.id,
        p_payment_amount: downPaymentAmount,
        p_user_id: userId
      });

      if (paymentProcessError) {
        console.error('Payment processing error:', paymentProcessError);
        throw new Error('Failed to process booking payment: ' + paymentProcessError.message);
      }

      const result = paymentResult as { success: boolean; error?: string };
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to process booking payment');
      }

      // Reserve shares temporarily
      const {
        error: reserveError
      } = await supabase.from('shares').update({
        available_shares: sharePool.available_shares - calculations.purchaseQuantity,
        updated_at: new Date().toISOString()
      }).eq('id', sharePool.id);
      if (reserveError) throw reserveError;

      toast.success('Share booking created successfully!');
      setQuantity('');
      setShowBookingConfirmation(false);
      onPurchaseComplete();
      await loadAllUserData();
    } catch (error: any) {
      console.error('Booking failed:', error);
      toast.error(error.message || 'Failed to create booking');
    }
  };
  const confirmPurchase = async () => {
    try {
      // Handle currency exchange if needed
      if (paymentMethod.needsExchange) {
        const exchangeSuccess = await processExchangeAndPayment(paymentMethod.sourceWallet, paymentMethod.wallet, paymentMethod.exchangeAmount, paymentMethod.exchangeRate);
        if (!exchangeSuccess) {
          return;
        }
      }
      const result = await processSharePurchase(userId, sharePool.id, calculations.purchaseQuantity, currentPrice, 'UGX', paymentMethod.wallet.id);
      if (result.success) {
        setQuantity('');
        setShowConfirmation(false);
        // Refresh all data to ensure UI is updated
        await Promise.all([loadAllUserData(), onPurchaseComplete()]);
        toast.success('Shares purchased successfully! Your balance has been updated.');
      }
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };
  if (priceLoading || limitsLoading || dataLoading) {
    return <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>;
  }
  return <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Buy Shares
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Share Status */}
          <Card className="w-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Share Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Main Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Shares Held</div>
                  <div className="text-lg font-semibold">{userSharesCount.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">shares</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Current Price</div>
                  <div className="text-lg font-semibold text-action-buy">UGX {currentPrice.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">per share</div>
                </div>
              </div>

              {/* Additional Info */}
              {pendingShares > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Pending:</span>
                    <div className="text-right">
                      <span className="font-medium">{pendingShares.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground ml-1">shares</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs value={purchaseMethod} onValueChange={value => setPurchaseMethod(value as 'full' | 'booking')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="full" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Full Payment
              </TabsTrigger>
              <TabsTrigger value="booking" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Booking (Installment)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="full" className="space-y-4">
              <div>
                <Label>Quantity</Label>
                <Input type="number" placeholder="Enter quantity" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" max={calculations.maxAllowedQuantity} onWheel={e => e.currentTarget.blur()} />
                <p className="text-sm text-muted-foreground mt-1">
                  Available: {Math.max(0, Math.min(sharePool.available_shares, Math.max(0, (limits?.max_buy_amount || 0) - userSharesCount - pendingShares))).toLocaleString()} shares | Max for your account: {limits ? (limits?.max_buy_amount || 0).toLocaleString() : 'Loading...'} shares | You own: {userSharesCount.toLocaleString()} | Pending: {pendingShares.toLocaleString()}
                </p>
              </div>

              {calculations.purchaseQuantity > 0 && <div className="bg-muted p-3 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Price per share:</span>
                    <span>UGX {currentPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Quantity:</span>
                    <span>{calculations.purchaseQuantity.toLocaleString()} shares</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>UGX {calculations.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Transaction Fee ({calculations.enhancedFees.percentage}%):</span>
                    <span>UGX {calculations.enhancedFees.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium border-t pt-2">
                    <span>Total Amount:</span>
                    <span>UGX {calculations.totalWithFees.toLocaleString()}</span>
                  </div>
                </div>}

              {paymentMethod && calculations.purchaseQuantity > 0 && <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-medium mb-2">Payment Method</h4>
                  {paymentMethod.needsExchange ? <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Repeat className="h-4 w-4" />
                        <span className="font-medium">Auto USD → UGX Exchange</span>
                      </div>
                       <div className="bg-white p-2 rounded border">
                          <div>Convert: {paymentMethod.exchangeAmount.toLocaleString()} USD</div>
                          <div>Receive: {(paymentMethod.exchangeAmount * paymentMethod.exchangeRate).toLocaleString()} UGX</div>
                          <div>Rate: 1 USD = {paymentMethod.exchangeRate.toLocaleString()} UGX</div>
                        </div>
                      <div>Available: USD {paymentMethod.sourceWallet.balance.toLocaleString()} + UGX {paymentMethod.wallet.balance.toLocaleString()}</div>
                    </div> : <div className="text-sm">
                      <div className="font-medium">UGX Wallet</div>
                      <div>Available: UGX {paymentMethod.wallet?.balance?.toLocaleString() || 0}</div>
                    </div>}
                </div>}

              <Button onClick={handlePurchaseSubmit} className="w-full" disabled={loading || paymentLoading || !calculations.purchaseQuantity || !paymentMethod?.wallet}>
                {loading || paymentLoading ? 'Processing...' : 'Purchase Shares'}
              </Button>
            </TabsContent>

            <TabsContent value="booking" className="space-y-4">
              <div>
                <Label>Quantity</Label>
                <Input type="number" placeholder="Enter quantity" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" max={calculations.maxAllowedQuantity} onWheel={e => e.currentTarget.blur()} />
                <p className="text-sm text-muted-foreground mt-1">
                  Available: {Math.max(0, Math.min(sharePool.available_shares, Math.max(0, (limits?.max_buy_amount || 0) - userSharesCount - pendingShares))).toLocaleString()} shares | Max for your account: {limits ? (limits?.max_buy_amount || 0).toLocaleString() : 'Loading...'} shares | You own: {userSharesCount.toLocaleString()} | Pending: {pendingShares.toLocaleString()}
                </p>
              </div>

              {calculations.purchaseQuantity > 0 && (
                <div className="bg-muted p-3 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Price per share:</span>
                    <span>UGX {currentPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Quantity:</span>
                    <span>{calculations.purchaseQuantity.toLocaleString()} shares</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>UGX {calculations.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Transaction Fees:</span>
                    <span className="text-red-600">UGX {calculations.enhancedFees.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium border-t pt-2">
                    <span>Total Cost:</span>
                    <span>UGX {calculations.totalWithFees.toLocaleString()}</span>
                  </div>
                  <div className="bg-blue-50 p-2 rounded mt-2 space-y-1">
                    <div className="flex justify-between text-sm font-medium text-blue-800">
                      <span>Down Payment ({limits?.required_down_payment_percentage || 30}%):</span>
                      <span>UGX {(calculations.totalWithFees * (limits?.required_down_payment_percentage || 30) / 100).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-blue-700">
                      <span>Remaining Balance:</span>
                      <span>UGX {(calculations.totalWithFees - (calculations.totalWithFees * (limits?.required_down_payment_percentage || 30) / 100)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  Book shares with installment payments. Pay {limits?.required_down_payment_percentage || 30}% down payment now and complete within the grace period.
                </AlertDescription>
              </Alert>

              <Button onClick={handleBookingSubmit} className="w-full" disabled={loading || !calculations.purchaseQuantity}>
                <Calendar className="h-4 w-4 mr-2" />
                {loading ? 'Processing...' : `Book ${calculations.purchaseQuantity.toLocaleString()} Shares`}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Purchase Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Share Purchase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Share:</span>
                <span>Yawatu Ordinary Shares</span>
              </div>
              <div className="flex justify-between">
                <span>Quantity:</span>
                <span>{calculations.purchaseQuantity.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Price per share:</span>
                <span>UGX {currentPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>UGX {calculations.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Transaction Fee:</span>
                <span>UGX {calculations.enhancedFees.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Total Amount:</span>
                <span>UGX {calculations.totalWithFees.toLocaleString()}</span>
              </div>
              
              {paymentMethod?.needsExchange && <div className="bg-yellow-50 p-2 rounded text-sm">
                  <div className="font-medium">Currency Exchange Required:</div>
                  <div>Converting {paymentMethod.exchangeAmount.toLocaleString()} {paymentMethod.sourceWallet.currency} to {(paymentMethod.exchangeAmount * paymentMethod.exchangeRate).toLocaleString()} UGX</div>
                </div>}
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This transaction will be processed immediately and cannot be reversed.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowConfirmation(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={confirmPurchase} disabled={loading || paymentLoading} className="flex-1">
                {loading || paymentLoading ? 'Processing...' : 'Confirm Purchase'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Confirmation Dialog */}
      <Dialog open={showBookingConfirmation} onOpenChange={setShowBookingConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Confirm Share Booking
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Share:</span>
                <span>Yawatu Ordinary Shares</span>
              </div>
              <div className="flex justify-between">
                <span>Quantity:</span>
                <span>{calculations.purchaseQuantity.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Price per share:</span>
                <span>UGX {currentPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>UGX {calculations.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Transaction Fee:</span>
                <span>UGX {calculations.enhancedFees.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Total Cost:</span>
                <span>UGX {calculations.totalWithFees.toLocaleString()}</span>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg mt-3">
                <h4 className="font-medium text-sm mb-2 text-blue-900">Installment Plan</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Down Payment ({limits?.required_down_payment_percentage || 30}%):</span>
                    <span className="font-medium">UGX {(calculations.totalWithFees * (limits?.required_down_payment_percentage || 30) / 100).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Remaining Balance:</span>
                    <span>UGX {(calculations.totalWithFees - (calculations.totalWithFees * (limits?.required_down_payment_percentage || 30) / 100)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Payment Period:</span>
                    <span>{limits?.credit_period_days || 30} days</span>
                  </div>
                </div>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-medium">Booking Terms:</div>
                  <ul className="text-sm space-y-0.5 ml-2">
                    <li>• Shares reserved upon down payment</li>
                    <li>• Complete payment within {limits?.credit_period_days || 30} days</li>
                    <li>• Ownership transfers on full payment</li>
                    <li>• One extension request allowed if needed</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowBookingConfirmation(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={confirmBooking} disabled={loading} className="flex-1">
                {loading ? 'Processing...' : 'Confirm Booking'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>;
};
export default EnhancedSharePurchaseFlow;