
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard, AlertCircle, DollarSign, Upload, Camera, Building2, Smartphone } from 'lucide-react';
import { useTransactionLimits } from '@/hooks/useTransactionLimits';
import { useTransactionFees } from '@/hooks/useTransactionFees';
import { useAdminPaymentConfigurations } from '@/hooks/useAdminPaymentConfigurations';

interface EnhancedWalletDepositFormProps {
  wallets: any[];
  onDepositComplete: () => void;
}

const EnhancedWalletDepositForm: React.FC<EnhancedWalletDepositFormProps> = ({
  wallets,
  onDepositComplete
}) => {
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [depositSlip, setDepositSlip] = useState<File | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Payment method specific fields
  const [selectedBank, setSelectedBank] = useState('');
  const [depositorName, setDepositorName] = useState('');
  const [mobileNetwork, setMobileNetwork] = useState('');
  const [merchantCode, setMerchantCode] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Credit card fields
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');

  const { checkTransactionLimit } = useTransactionLimits(userId);
  const { getFeeDetails } = useTransactionFees();
  const { configurations } = useAdminPaymentConfigurations();

  useEffect(() => {
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
  };

  const selectedWallet = wallets.find(w => w.id === selectedWalletId);
  const depositAmount = parseFloat(amount) || 0;
  const feeDetails = getFeeDetails('deposit', depositAmount, selectedWallet?.currency || 'UGX');
  const totalAmount = depositAmount + feeDetails.totalFee;

  const resetPaymentFields = () => {
    setSelectedBank('');
    setDepositorName('');
    setMobileNetwork('');
    setMerchantCode('');
    setTransactionId('');
    setAccountHolderName('');
    setPhoneNumber('');
    setCardNumber('');
    setExpiryDate('');
    setCvv('');
    setCardHolderName('');
  };

  // Helpers
  const formatPhoneToE164 = (input: string, defaultCountryCode = '256') => {
    if (!input) return '';
    // Keep digits and plus
    let v = input.replace(/[^\d+]/g, '');
    // If starts with 0, replace with default country code
    if (v.startsWith('0')) v = defaultCountryCode + v.slice(1);
    // If starts with country code without +, add +
    if (/^\d{10,15}$/.test(v) && v.startsWith(defaultCountryCode)) {
      v = `+${v}`;
    }
    // If only digits and not starting with +, and length seems like national
    if (/^\d{9,12}$/.test(v) && !v.startsWith('+')) {
      v = `+${defaultCountryCode}${v}`;
    }
    // Final sanitize: + followed by 10-15 digits
    if (!/^\+\d{10,15}$/.test(v)) return '';
    return v;
  };

  const detectUgNetwork = (e164: string): 'mtn' | 'airtel' => {
    // Expect +256XXXXXXXXX
    const digits = e164.replace(/\D/g, ''); // 2567xxxxxxx
    const afterCC = digits.slice(3, 5); // first two after 256
    const mtnPrefixes = new Set(['76', '77', '78', '39']);
    const airtelPrefixes = new Set(['70', '74', '75']);
    if (mtnPrefixes.has(afterCC)) return 'mtn';
    if (airtelPrefixes.has(afterCC)) return 'airtel';
    return 'mtn';
  };

  const handlePhoneChange = (val: string) => {
    setPhoneNumber(val);
    const e164 = formatPhoneToE164(val);
    if (e164) {
      const autoNet = detectUgNetwork(e164);
      setMobileNetwork(autoNet);
    }
  };

  const handlePaymentMethodChange = (method: string) => {
    setPaymentMethod(method);
    resetPaymentFields();
  };

  const handleNetworkChange = (network: string) => {
    setMobileNetwork(network);
    // Reset merchant code when network changes
    setMerchantCode('');
  };

  const validatePaymentDetails = () => {
    if (paymentMethod === 'bank') {
      return selectedBank && depositorName;
    } else if (paymentMethod === 'mobile_money') {
      // Phone must be valid E.164; network will be auto-detected
      return !!formatPhoneToE164(phoneNumber);
    } else if (paymentMethod === 'credit_card') {
      return cardNumber && expiryDate && cvv && cardHolderName;
    }
    return false;
  };

  const getBankDetails = () => {
    if (selectedBank === 'dfcu') {
      return { name: 'DFCU Bank', accountNumber: '01660013163693', accountName: 'Yawatu Limited' };
    } else if (selectedBank === 'equity') {
      return { name: 'Equity Bank', accountNumber: '1040102428506', accountName: 'Yawatu Limited' };
    }
    return null;
  };

  const handleInitiateDeposit = () => {
    if (!selectedWallet || !depositAmount || !paymentMethod) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!validatePaymentDetails()) {
      toast.error('Please complete payment method details');
      return;
    }

    const limitCheck = checkTransactionLimit('deposit', depositAmount);
    if (!limitCheck.allowed) {
      toast.error(limitCheck.reason || 'Transaction limit exceeded');
      return;
    }

    setShowConfirmation(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setDepositSlip(file);
    }
  };

  const handleConfirmDeposit = async () => {
    if (!userId || !selectedWallet) return;

    setLoading(true);
    try {
      // If mobile money, use the process-deposit edge function (working in test)
      if (paymentMethod === 'mobile_money') {
        console.log('🚀 Initiating mobile money deposit via SimpleLes API');
        
        // Ensure phone is in E.164 format (e.g., +2567XXXXXXXX)
        const formattedPhone = formatPhoneToE164(phoneNumber);
        if (!formattedPhone) {
          throw new Error('Please enter a valid phone number in international format');
        }
        
        const { data, error } = await supabase.functions.invoke('test-relworx-api', {
          body: {
            account_no: 'YEW2024A25E4R',
            reference: `DEP_${Date.now()}_${userId.slice(0, 8)}`,
            msisdn: formattedPhone,
            currency: selectedWallet.currency,
            amount: depositAmount.toString(),
            description: `Wallet deposit: ${selectedWallet.currency} ${depositAmount}`
          }
        });

        if (error) {
          console.error('❌ Deposit error:', error);
          throw new Error('Failed to process mobile money deposit');
        }

        console.log('Deposit results:', data);

        if (data.success) {
          toast.success('Deposit created successfully! Check your phone for payment prompt.');
        } else {
          throw new Error(data.error || 'Payment gateway error');
        }

        setShowConfirmation(false);
        setSelectedWalletId('');
        setAmount('');
        setPaymentMethod('');
        resetPaymentFields();
        setDepositSlip(null);
        onDepositComplete();
        return;
      }

      // For other payment methods, create transaction record
      let depositSlipUrl = '';

      // Upload deposit slip if provided
      if (depositSlip) {
        const fileExt = depositSlip.name.split('.').pop();
        const fileName = `${userId}/deposits/slip-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('deposit-slips')
          .upload(fileName, depositSlip);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('deposit-slips')
          .getPublicUrl(fileName);

        depositSlipUrl = publicUrl;
      }

      const paymentDetails = {
        method: paymentMethod,
        ...(paymentMethod === 'bank' && {
          bank: getBankDetails(),
          depositorName
        }),
        ...(paymentMethod === 'credit_card' && {
          cardNumber: `****${cardNumber.slice(-4)}`,
          cardHolderName
        })
      };

      // Create deposit transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          wallet_id: selectedWallet.id,
          amount: depositAmount,
          currency: selectedWallet.currency,
          transaction_type: 'deposit',
          status: 'pending',
          approval_status: 'pending',
          reference: `DEP-${Date.now()}`,
          admin_notes: JSON.stringify({
            payment_details: paymentDetails,
            transaction_fee: feeDetails.totalFee,
            fee_percentage: feeDetails.percentage,
            deposit_slip_url: depositSlipUrl,
            total_amount_to_pay: totalAmount
          })
        });

      if (transactionError) throw transactionError;

      toast.success('Deposit request submitted successfully');
      setSelectedWalletId('');
      setAmount('');
      setPaymentMethod('');
      resetPaymentFields();
      setDepositSlip(null);
      setShowConfirmation(false);
      onDepositComplete();
    } catch (error: any) {
      console.error('Error creating deposit:', error);
      toast.error(`Failed to create deposit: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentMethodForm = () => {
    if (paymentMethod === 'bank') {
      const bankDetails = getBankDetails();
      return (
        <div className="space-y-4">
          <div>
            <Label>Select Bank</Label>
            <Select value={selectedBank} onValueChange={setSelectedBank}>
              <SelectTrigger>
                <SelectValue placeholder="Choose bank" />
              </SelectTrigger>
               <SelectContent className="bg-background border shadow-md z-[60]">
                 <SelectItem value="dfcu">DFCU Bank</SelectItem>
                 <SelectItem value="equity">Equity Bank</SelectItem>
               </SelectContent>
            </Select>
          </div>

          {bankDetails && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {bankDetails.name} Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Account Name:</span>
                    <p>{bankDetails.accountName}</p>
                  </div>
                  <div>
                    <span className="font-medium">Account Number:</span>
                    <p>{bankDetails.accountNumber}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div>
            <Label>Depositor Name</Label>
            <Input
              placeholder="Your name as depositor"
              value={depositorName}
              onChange={(e) => setDepositorName(e.target.value)}
            />
          </div>
        </div>
      );
    }

    if (paymentMethod === 'mobile_money') {
      return (
        <div className="space-y-4">
          <div>
            <Label>Phone Number</Label>
            <Input
              placeholder="+256778123456"
              value={phoneNumber}
              onChange={(e) => handlePhoneChange(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter in international format; we'll auto-detect the network
            </p>
          </div>

          <div>
            <Label>Network</Label>
            <Select value={mobileNetwork} onValueChange={handleNetworkChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select network" />
              </SelectTrigger>
               <SelectContent className="bg-background border shadow-md z-[60]">
                 <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                 <SelectItem value="airtel">Airtel Money</SelectItem>
               </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Merchant Code</Label>
            <Select value={merchantCode} onValueChange={setMerchantCode}>
              <SelectTrigger>
                <SelectValue placeholder={
                  loading 
                    ? "Loading merchant codes..." 
                    : "Select merchant code"
                } />
              </SelectTrigger>
               <SelectContent className="bg-background border shadow-md z-[60]">
                 {configurations?.merchantCodes
                   ?.filter(mc => mc.currency === selectedWallet?.currency && mc.is_active && mc.approval_status === 'approved')
                   ?.map(mc => (
                     <SelectItem key={mc.id} value={mc.merchant_code}>
                       {mc.merchant_code} - {mc.provider_name}
                     </SelectItem>
                   )) ?? []}
               </SelectContent>
            </Select>
            {!loading && configurations?.merchantCodes?.filter(mc => mc.currency === selectedWallet?.currency && mc.is_active && mc.approval_status === 'approved').length === 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                No merchant codes available for {selectedWallet?.currency}. Contact support.
              </p>
            )}
            {/* Debug info */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-muted-foreground mt-1">
                Debug: Total codes: {configurations?.merchantCodes?.length || 0}, 
                Active for {selectedWallet?.currency}: {configurations?.merchantCodes?.filter(mc => mc.currency === selectedWallet?.currency && mc.is_active && mc.approval_status === 'approved').length || 0}
              </div>
            )}
          </div>

          <div>
            <Label>Transaction ID</Label>
            <Input
              placeholder="Mobile money transaction ID"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
            />
          </div>

          <div>
            <Label>Account Holder Name</Label>
            <Input
              placeholder="Name on mobile money account"
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
            />
          </div>
        </div>
      );
    }

    if (paymentMethod === 'credit_card') {
      return (
        <div className="space-y-4">
          <div>
            <Label>Card Number</Label>
            <Input
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              maxLength={19}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Expiry Date</Label>
              <Input
                placeholder="MM/YY"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                maxLength={5}
              />
            </div>
            <div>
              <Label>CVV</Label>
              <Input
                placeholder="123"
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                maxLength={4}
              />
            </div>
          </div>
          <div>
            <Label>Card Holder Name</Label>
            <Input
              placeholder="Name on card"
              value={cardHolderName}
              onChange={(e) => setCardHolderName(e.target.value)}
            />
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Deposit Funds
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Wallet</Label>
            <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose wallet to deposit to" />
              </SelectTrigger>
               <SelectContent className="bg-background border shadow-md z-[60]">
                 {wallets.map((wallet) => (
                   <SelectItem key={wallet.id} value={wallet.id}>
                     {wallet.currency} Wallet (Balance: {wallet.balance.toLocaleString()})
                   </SelectItem>
                 ))}
               </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Deposit Amount</Label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0"
              onWheel={(e) => e.currentTarget.blur()}
            />
          </div>

          <div>
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={handlePaymentMethodChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
               <SelectContent className="bg-background border shadow-md z-[60]">
                 <SelectItem value="mobile_money">Mobile Money</SelectItem>
                 <SelectItem value="bank">Bank Transfer</SelectItem>
                 <SelectItem value="credit_card">Credit Card</SelectItem>
               </SelectContent>
            </Select>
          </div>

          {paymentMethod && renderPaymentMethodForm()}

          {selectedWallet && depositAmount > 0 && (
            <div className="bg-muted p-3 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Deposit Amount:</span>
                <span>{selectedWallet.currency} {depositAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Transaction Fee ({feeDetails.percentage}%):</span>
                <span className="text-red-600">{selectedWallet.currency} {feeDetails.totalFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-medium border-t pt-2">
                <span>Total Amount to Pay:</span>
                <span className="text-blue-600 font-bold">{selectedWallet.currency} {totalAmount.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div>
            <Label>Upload Deposit Slip/Screenshot (Optional)</Label>
            <div className="mt-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="deposit-slip"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('deposit-slip')?.click()}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              </div>
              {depositSlip && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {depositSlip.name}
                </p>
              )}
            </div>
          </div>

          <Button 
            onClick={handleInitiateDeposit} 
            className="w-full"
            disabled={loading || !selectedWalletId || !depositAmount || !paymentMethod || !validatePaymentDetails()}
          >
            {loading ? 'Processing...' : 'Submit Deposit Request'}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deposit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please verify all details before confirming your deposit request.
              </AlertDescription>
            </Alert>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-medium">Deposit Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Wallet:</span>
                <span>{selectedWallet?.currency} Wallet</span>
                
                <span className="text-muted-foreground">Amount:</span>
                <span>{selectedWallet?.currency} {depositAmount.toLocaleString()}</span>
                
                <span className="text-muted-foreground">Fee:</span>
                <span className="text-red-600">{selectedWallet?.currency} {feeDetails.totalFee.toLocaleString()}</span>
                
                <span className="text-muted-foreground font-medium">Total:</span>
                <span className="font-medium text-blue-600">{selectedWallet?.currency} {totalAmount.toLocaleString()}</span>
                
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="capitalize">{paymentMethod.replace('_', ' ')}</span>
                
                <span className="text-muted-foreground">Deposit Slip:</span>
                <span>{depositSlip ? 'Attached' : 'Not provided'}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmation(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmDeposit}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Processing...' : 'Confirm Deposit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnhancedWalletDepositForm;
