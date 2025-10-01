import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useNavigate } from 'react-router-dom';
import { Calculator, ShoppingCart, CreditCard, Banknote, Info, DollarSign } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSharePricing } from '@/hooks/useSharePricing';
import { useContextualBuyingLimits } from '@/hooks/useContextualBuyingLimits';
import { usePromotionalCampaigns } from '@/hooks/usePromotionalCampaigns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PublicShareOrderFormProps {
  open: boolean;
  onClose: () => void;
}

const PublicShareOrderForm: React.FC<PublicShareOrderFormProps> = ({ open, onClose }) => {
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    shareQuantity: '',
    investmentAmount: '',
    paymentType: 'cash' // 'cash' or 'installment'
  });
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [shareId, setShareId] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<number>(0.000270); // Default UGX to USD rate
  const navigate = useNavigate();

  // Get current admin pricing and buying limits
  const { currentPrice: sharePrice, loading: priceLoading } = useSharePricing(shareId);
  const { limits, loading: limitsLoading } = useContextualBuyingLimits('individual');
  
  // Get promotional campaigns
  const { 
    applicableBenefits, 
    loading: campaignsLoading,
    calculateDiscountedAmount,
    getBonusShares,
    getCashbackAmount
  } = usePromotionalCampaigns(formData.email);

  // Load default share and exchange rate on mount
  useEffect(() => {
    loadDefaultShare();
    loadExchangeRate();
  }, []);

  const loadDefaultShare = async () => {
    try {
      const { data, error } = await supabase
        .from('shares')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (error) throw error;
      if (data) setShareId(data.id);
    } catch (error) {
      console.error('Error loading default share:', error);
      toast.error('Failed to load share information');
    }
  };

  const loadExchangeRate = async () => {
    try {
      const { data, error } = await supabase
        .from('currency_conversion')
        .select('rate')
        .eq('from_currency', 'UGX')
        .eq('to_currency', 'USD')
        .single();

      if (error) throw error;
      if (data) setExchangeRate(data.rate);
    } catch (error) {
      console.error('Error loading exchange rate:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate based on quantity or amount
      if (field === 'shareQuantity' && value && sharePrice) {
        updated.investmentAmount = (parseInt(value) * sharePrice).toString();
      } else if (field === 'investmentAmount' && value && sharePrice) {
        updated.shareQuantity = Math.floor(parseInt(value) / sharePrice).toString();
      }
      
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Store the order intent in localStorage
    const orderData = {
      ...formData,
      sharePrice,
      originalAmount,
      totalAmount,
      savings,
      bonusShares,
      totalShares,
      cashback,
      applicableBenefits,
      downPaymentAmount,
      downPaymentPercentage,
      creditPeriod,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('pendingShareOrder', JSON.stringify(orderData));
    
    // Show authentication prompt
    setShowAuthPrompt(true);
  };

  const handleLogin = () => {
    navigate('/auth?mode=login');
  };

  const handleRegister = () => {
    navigate('/auth?mode=register');
  };

  // Calculate amounts based on admin settings and promotions
  const originalAmount = parseInt(formData.investmentAmount || '0');
  const { discountedAmount, savings } = calculateDiscountedAmount(originalAmount);
  const totalAmount = discountedAmount;
  const bonusShares = getBonusShares();
  const totalShares = parseInt(formData.shareQuantity || '0') + bonusShares;
  const cashback = getCashbackAmount();
  
  const downPaymentPercentage = limits?.required_down_payment_percentage || 30;
  const downPaymentAmount = formData.paymentType === 'installment' 
    ? Math.ceil(totalAmount * (downPaymentPercentage / 100))
    : totalAmount;
  const remainingAmount = totalAmount - downPaymentAmount;
  const usdEquivalent = totalAmount * exchangeRate;
  const creditPeriod = limits?.credit_period_days || 365;

  return (
    <>
      <Dialog open={open && !showAuthPrompt} onOpenChange={onClose}>
        <DialogContent className="max-w-sm sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary text-lg sm:text-xl">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Place Your Share Order</span>
              <span className="sm:hidden">Order Shares</span>
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+256 700 000000"
                  required
                />
              </div>
            </div>

            {/* Promotional Benefits Alert */}
            {applicableBenefits.length > 0 && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium text-sm mb-1">🎉 Special Offers Available!</div>
                  <div className="text-xs space-y-1">
                    {applicableBenefits.map((benefit, index) => (
                      <div key={index}>• {benefit.description}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Currency info - UGX only */}
            <div className="text-xs sm:text-sm text-muted-foreground p-2 sm:p-3 bg-muted/30 rounded-lg">
              <span className="hidden sm:inline">All transactions in UGX. USD shown for reference.</span>
              <span className="sm:hidden">Currency: UGX</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shareQuantity">Number of Shares</Label>
                <Input
                  id="shareQuantity"
                  type="number"
                  min={limits?.min_buy_amount || 1}
                  max={limits?.max_buy_amount || 10000}
                  value={formData.shareQuantity}
                  onChange={(e) => handleInputChange('shareQuantity', e.target.value)}
                  placeholder="10"
                  required
                />
                {limits && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="hidden sm:inline">Min: {limits.min_buy_amount} shares, Max: {limits.max_buy_amount.toLocaleString()} shares</span>
                    <span className="sm:hidden">{limits.min_buy_amount}-{limits.max_buy_amount.toLocaleString()}</span>
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="investmentAmount">Total Investment (UGX)</Label>
                <Input
                  id="investmentAmount"
                  type="number"
                  min={sharePrice || 1}
                  step={sharePrice || 1}
                  value={formData.investmentAmount}
                  onChange={(e) => handleInputChange('investmentAmount', e.target.value)}
                  placeholder="250000"
                  required
                />
                {totalAmount > 0 && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <DollarSign className="h-3 w-3" />
                    <span>≈ ${usdEquivalent.toFixed(2)} USD</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label className="text-base font-medium">Payment Method</Label>
              <RadioGroup
                value={formData.paymentType}
                onValueChange={(value) => handleInputChange('paymentType', value)}
                className="mt-2"
              >
                <div className="flex items-center space-x-2 p-2 sm:p-3 border rounded-lg">
                  <RadioGroupItem value="cash" id="cash" />
                  <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Banknote className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="font-medium text-sm sm:text-base">Full Payment</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        <span className="hidden sm:inline">Pay the complete amount upfront</span>
                        <span className="sm:hidden">Pay all now</span>
                      </div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-2 sm:p-3 border rounded-lg">
                  <RadioGroupItem value="installment" id="installment" />
                  <Label htmlFor="installment" className="flex items-center gap-2 cursor-pointer flex-1">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="font-medium text-sm sm:text-base">Installment Plan</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        <span className="hidden sm:inline">{downPaymentPercentage}% down payment, balance over {Math.round(creditPeriod / 30)} months</span>
                        <span className="sm:hidden">{downPaymentPercentage}% down, {Math.round(creditPeriod / 30)}mo</span>
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Payment Summary */}
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Calculator className="h-4 w-4" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Share Price:</span>
                  <span>UGX {sharePrice?.toLocaleString() || 'Loading...'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quantity:</span>
                  <span>{formData.shareQuantity || 0} shares</span>
                </div>
                {bonusShares > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Bonus Shares:</span>
                    <span>+{bonusShares} shares</span>
                  </div>
                )}
                {bonusShares > 0 && (
                  <div className="flex justify-between font-medium text-green-600">
                    <span>Total Shares:</span>
                    <span>{totalShares} shares</span>
                  </div>
                )}
                {savings > 0 && (
                  <div className="flex justify-between">
                    <span>Original Amount:</span>
                    <span className="line-through text-muted-foreground">UGX {originalAmount.toLocaleString()}</span>
                  </div>
                )}
                {savings > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount Savings:</span>
                    <span>-UGX {savings.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium">
                  <span>Amount to Pay:</span>
                  <div className="text-right">
                    <div className={savings > 0 ? "text-green-600" : ""}>UGX {totalAmount.toLocaleString()}</div>
                    {totalAmount > 0 && (
                      <div className="text-xs text-muted-foreground">≈ ${usdEquivalent.toFixed(2)} USD</div>
                    )}
                  </div>
                </div>
                {cashback.amount > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Cashback Bonus:</span>
                    <span>+{cashback.currency} {cashback.amount.toLocaleString()}</span>
                  </div>
                )}
                
                {formData.paymentType === 'installment' && (
                  <>
                    <hr className="my-2" />
                    <div className="flex justify-between text-primary">
                      <span>Down Payment ({downPaymentPercentage}%):</span>
                      <span>UGX {downPaymentAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Remaining Balance:</span>
                      <span>UGX {remainingAmount.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {formData.paymentType === 'installment' && (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">With installment plan, you'll own the shares immediately but pay the balance over {Math.round(creditPeriod / 30)} months.</span>
                  <span className="sm:hidden">Own shares now, pay over {Math.round(creditPeriod / 30)} months.</span>
                  {limits && (
                    <span className="block mt-1 text-xs">
                      <span className="hidden sm:inline">Credit terms: {downPaymentPercentage}% down payment required, {creditPeriod} days payment period.</span>
                      <span className="sm:hidden">{downPaymentPercentage}% down, {creditPeriod}d period</span>
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={priceLoading || limitsLoading || campaignsLoading || !sharePrice}
            >
              {priceLoading || limitsLoading || campaignsLoading ? 'Loading...' : `Continue to ${formData.paymentType === 'cash' ? 'Payment' : 'Booking'}`}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-4">
            {sharePrice ? (
              <>
                Minimum investment: UGX {sharePrice.toLocaleString()} (1 share)
                {limits && (
                  <span className="block">
                    Account limits: {limits.min_buy_amount}-{limits.max_buy_amount.toLocaleString()} shares for {limits.account_type} accounts
                  </span>
                )}
              </>
            ) : (
              'Loading pricing information...'
            )}
          </p>
        </DialogContent>
      </Dialog>

      {/* Authentication Prompt */}
      <Dialog open={showAuthPrompt} onOpenChange={setShowAuthPrompt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To complete your share order, you need to {formData.paymentType === 'cash' ? 'login or create an account' : 'login or register'}.
            </p>
            
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Your Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Shares:</span>
                  <span>{totalShares > parseInt(formData.shareQuantity || '0') ? `${formData.shareQuantity} + ${bonusShares} bonus` : formData.shareQuantity}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount to Pay:</span>
                  <span className={savings > 0 ? "text-green-600" : ""}>UGX {totalAmount.toLocaleString()}</span>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Savings:</span>
                    <span>UGX {savings.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Payment Type:</span>
                  <span className="capitalize">{formData.paymentType}</span>
                </div>
                {formData.paymentType === 'installment' && (
                  <div className="flex justify-between text-primary">
                    <span>Initial Payment:</span>
                    <span>UGX {downPaymentAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="truncate">{formData.email}</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={handleLogin} variant="outline">
                I Have Account
              </Button>
              <Button onClick={handleRegister}>
                Create Account
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Your order details are saved and will be available after authentication.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PublicShareOrderForm;