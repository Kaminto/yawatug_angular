import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Smartphone, CreditCard, Building } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTransactionFees } from '@/hooks/useTransactionFees';
import { useAdminPaymentConfigurations } from '@/hooks/useAdminPaymentConfigurations';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { DepositPaymentStatusModal } from './DepositPaymentStatusModal';
import DepositConfirmationDialog from './DepositConfirmationDialog';

interface EnhancedWalletDepositFormProps {
  wallets: any[];
  onDepositComplete: () => void;
}

const EnhancedWalletDepositForm: React.FC<EnhancedWalletDepositFormProps> = ({
  wallets,
  onDepositComplete
}) => {
  console.log('EnhancedWalletDepositForm received wallets:', wallets);
  
  const [selectedWallet, setSelectedWallet] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');
  const [loading, setLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [showPaymentStatusModal, setShowPaymentStatusModal] = useState(false);
  const [showDepositConfirmation, setShowDepositConfirmation] = useState(false);
  const [currentTransactionId, setCurrentTransactionId] = useState<string | null>(null);
  const [currentTransactionReference, setCurrentTransactionReference] = useState<string | null>(null);
  const [currentDepositDetails, setCurrentDepositDetails] = useState<any>(null);
  
  const { 
    configurations, 
    loading: configLoading, 
    getAvailablePaymentMethods,
    getBankAccountsForDeposit 
  } = useAdminPaymentConfigurations();
  const [paymentDetails, setPaymentDetails] = useState({
    phoneNumber: '',
    accountNumber: '',
    bankName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    accountName: '',
    mobileMoneyType: '',
    network: '',
    merchantCode: '',
    transactionId: ''
  });

  const { getFeeDetails } = useTransactionFees();

  const wallet = wallets.find(w => w.id === selectedWallet);
  const amountNum = parseFloat(amount) || 0;
  const feeInfo = wallet ? getFeeDetails('deposit', amountNum, wallet.currency) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWallet || !amount || amountNum <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Handle RelWorx mobile money payment
      if (paymentMethod === 'mobile_money' && paymentDetails.mobileMoneyType === 'relworx') {
        if (!paymentDetails.phoneNumber) {
          toast.error('Please provide phone number for RelWorx payment');
          return;
        }

        const phoneParsed = parsePhoneNumberFromString(paymentDetails.phoneNumber || '', 'UG');
        const msisdn = phoneParsed?.isValid() ? phoneParsed.format('E.164') : null;
        if (!msisdn) {
          toast.error('Invalid phone number. Use international format like +2567XXXXXXXX');
          return;
        }

        const feeDetails = feeInfo?.totalFee || 0;
        const totalAmount = amountNum + feeDetails;
        const amountStr = totalAmount.toFixed(2); // Include fees in payment

        const reference = `DEP_${Date.now()}`;

        // Open the payment status modal immediately with countdown
        setCurrentTransactionReference(reference);
        setShowPaymentStatusModal(true);

        const { data, error } = await supabase.functions.invoke('test-relworx-api', {
          body: {
            account_no: 'YEW2024A25E4R',
            reference,
            msisdn,
            currency: wallet!.currency,
            amount: amountStr, // Total amount including fees
            description: `Deposit to ${wallet!.currency} wallet via RelWorx (incl. fees)`
          }
        });

        if (error) {
          console.error('RelWorx payment error:', error);
          const errorMessage = (data as any)?.error || error.message || 'Failed to process RelWorx payment';
          toast.error(errorMessage);
          
          if (errorMessage.includes('Invalid access for IP') || errorMessage.includes('INVALID_IP')) {
            toast.info('⚠️ IP Whitelisting Issue: Contact RelWorx to disable IP restrictions and use API authentication instead. See RelWorx Test page for details.', {
              duration: 10000
            });
          }
          return;
        }

        if (!data?.success) {
          toast.error(data?.error || 'Payment processing failed');
          return;
        }

        // Create transaction record
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            wallet_id: selectedWallet,
            amount: amountNum,
            currency: wallet!.currency,
            transaction_type: 'deposit',
            status: 'pending',
            reference,
            approval_status: 'pending',
            metadata: {
              payment_method: 'mobile_money_relworx',
              phone_number: msisdn,
              provider_response: data.data
            }
          })
          .select()
          .single();

        if (txError) {
          console.error('Transaction record error:', txError);
          toast.warning('Payment initiated but failed to log transaction. Contact support.');
        } else {
          // Show payment status modal
          setCurrentTransactionId(txData.id);
          setCurrentTransactionReference(reference);
          setShowPaymentStatusModal(true);
          
          const feeDetails = feeInfo?.totalFee || 0;
          
          // Show deposit confirmation dialog
          setCurrentDepositDetails({
            amount: amountNum,
            currency: wallet!.currency,
            fee: feeDetails,
            total: amountNum + feeDetails,
            phoneNumber: msisdn,
            method: 'mobile_money_relworx',
            reference: reference,
            status: 'processing'
          });
          setShowDepositConfirmation(true);
        }

        setAmount('');
        setPaymentDetails({
          phoneNumber: '',
          accountNumber: '',
          bankName: '',
          cardNumber: '',
          expiryDate: '',
          cvv: '',
          accountName: '',
          mobileMoneyType: '',
          network: '',
          merchantCode: '',
          transactionId: ''
        });
        // Don't call onDepositComplete here - let modal handle it
        return;
      }

      // Handle other payment methods (manual processing)
      // Prepare admin notes with user-entered payment details
      const adminNotesData = {
        payment_method: paymentMethod,
        transaction_id: paymentDetails.transactionId || null,
        phone_number: paymentDetails.phoneNumber || null,
        network: paymentDetails.network || null,
        merchant_code: paymentDetails.merchantCode || null,
        timestamp: new Date().toISOString()
      };

      const reference = `DEP-${Date.now()}-${user.id.slice(0, 8)}`;

      // Open the payment status modal immediately with countdown
      setCurrentTransactionReference(reference);
      setShowPaymentStatusModal(true);

      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          wallet_id: selectedWallet,
          transaction_type: 'deposit',
          amount: amountNum,
          currency: wallet!.currency,
          status: 'pending',
          approval_status: 'pending',
          admin_notes: JSON.stringify(adminNotesData),
          reference
        })
        .select()
        .single();

      if (transactionError) {
        console.error('Transaction creation error:', transactionError);
        throw new Error('Failed to create deposit transaction');
      }

      console.log('Deposit transaction created successfully:', transaction.id);
      
      // Show payment status modal for manual methods too
      setCurrentTransactionId(transaction.id);
      setCurrentTransactionReference(reference);
      setShowPaymentStatusModal(true);
      
      const feeDetails = feeInfo?.totalFee || 0;
      
      // Show deposit confirmation dialog
      setCurrentDepositDetails({
        amount: amountNum,
        currency: wallet!.currency,
        fee: feeDetails,
        total: amountNum + feeDetails,
        method: paymentMethod,
        reference: reference,
        status: 'pending'
      });
      setShowDepositConfirmation(true);
      setAmount('');
      setPaymentDetails({
        phoneNumber: '',
        accountNumber: '',
        bankName: '',
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        accountName: '',
        mobileMoneyType: '',
        network: '',
        merchantCode: '',
        transactionId: ''
      });
      // Don't call onDepositComplete here - let modal handle it
    } catch (error: any) {
      console.error('Deposit error:', error);
      toast.error(error.message || 'Failed to process deposit');
    } finally {
      setLoading(false);
    }
  };

  const PaymentMethodIcon = ({ method }: { method: string }) => {
    switch (method) {
      case 'mobile_money':
        return <Smartphone className="h-5 w-5" />;
      case 'bank_transfer':
        return <Building className="h-5 w-5" />;
      case 'credit_card':
        return <CreditCard className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PaymentMethodIcon method={paymentMethod} />
          Deposit Funds
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Wallet Selection */}
          <div className="space-y-2">
            <Label htmlFor="wallet">Select Wallet</Label>
            <Select value={selectedWallet} onValueChange={setSelectedWallet}>
              <SelectTrigger>
                <SelectValue placeholder="Choose wallet" />
              </SelectTrigger>
               <SelectContent className="bg-white dark:bg-gray-800 border shadow-lg z-[9999] min-w-[200px]">
                {wallets.length > 0 ? (
                  wallets.map((wallet) => (
                    <SelectItem key={wallet.id} value={wallet.id} className="cursor-pointer">
                      <div className="flex items-center justify-between w-full">
                        <span>{wallet.currency} Wallet</span>
                        <Badge variant="outline">
                          {wallet.currency} {wallet.balance?.toLocaleString() || '0'}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-wallets" disabled>
                    No wallets available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min="1"
              step="0.01"
            />
            {feeInfo && amountNum > 0 && (
              <div className="text-sm text-muted-foreground">
                Transaction fee: {wallet?.currency} {feeInfo.totalFee.toLocaleString()}
              </div>
            )}
          </div>

          {/* Payment Method Tabs */}
          <Tabs value={paymentMethod} onValueChange={setPaymentMethod}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="mobile_money" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Mobile Money
              </TabsTrigger>
              <TabsTrigger value="bank_transfer" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Bank Transfer
              </TabsTrigger>
              <TabsTrigger value="credit_card" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Credit Card
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mobile_money" className="space-y-4">
              <div className="space-y-4">
                <Alert>
                  <Smartphone className="h-4 w-4" />
                  <AlertDescription>
                    Choose between merchant codes or RelWorx instant confirmation
                  </AlertDescription>
                </Alert>
                
                {/* Mobile Money Options - Dropdown Selection */}
                <div className="space-y-2">
                  <Label>Mobile Money Method</Label>
                  <Select 
                    value={paymentDetails.mobileMoneyType} 
                    onValueChange={(value) => setPaymentDetails(prev => ({...prev, mobileMoneyType: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select deposit method" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border shadow-lg z-[9999] min-w-[200px]">
                      <SelectItem value="relworx">
                        <div className="flex items-center gap-3 py-1">
                          <div className="flex-1">
                            <div className="font-medium">Instant Deposit</div>
                            <div className="text-xs text-muted-foreground">Via RelWorx - Instant confirmation</div>
                          </div>
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">Instant</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="merchant_code">
                        <div className="flex items-center gap-3 py-1">
                          <div className="flex-1">
                            <div className="font-medium">Merchant Deposit</div>
                            <div className="text-xs text-muted-foreground">Via merchant codes - Manual processing</div>
                          </div>
                          <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">Manual</Badge>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Merchant Code Fields */}
                {paymentDetails.mobileMoneyType === 'merchant_code' && (
                  <>
                    <div className="space-y-2">
                      <Label>Network</Label>
                      <Select 
                        value={paymentDetails.network} 
                        onValueChange={(value) => setPaymentDetails(prev => ({...prev, network: value}))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select network" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 border shadow-lg z-[9999] min-w-[200px]">
                          <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                          <SelectItem value="airtel">Airtel Money</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                     {paymentDetails.network && (
                       <div className="space-y-2">
                         <Label>
                           {paymentDetails.network === 'mtn' ? 'MTN Momo Merchant Code' : 'Airtel Pay Code'}
                         </Label>
                         <Select 
                           value={paymentDetails.merchantCode} 
                           onValueChange={(value) => setPaymentDetails(prev => ({...prev, merchantCode: value}))}
                         >
                           <SelectTrigger>
                             <SelectValue placeholder="Select code" />
                           </SelectTrigger>
                             <SelectContent className="bg-white dark:bg-gray-800 border shadow-lg z-[9999] min-w-[200px]">
                               {(() => {
                                  // Filter merchant codes by selected network and currency
                                  const networkProviderMap = {
                                    'mtn': ['MTN', 'mtn'],
                                    'airtel': ['Airtel', 'airtel']
                                  };
                                  
                                  const allowedProviders = networkProviderMap[paymentDetails.network as keyof typeof networkProviderMap] || [];
                                  
                                  const availableCodes = (configurations.merchantCodes || []).filter(mc => 
                                    mc.currency === wallet?.currency && 
                                    mc.is_active && 
                                    mc.approval_status === 'approved' &&
                                    allowedProviders.some(provider => 
                                      mc.provider_name?.toLowerCase().includes(provider.toLowerCase())
                                    )
                                  );
                                  
                                  return availableCodes.length > 0 ? (
                                    availableCodes.map(code => (
                                      <SelectItem key={code.id} value={code.merchant_code}>
                                        {code.merchant_code} - {code.provider_name}
                                      </SelectItem>
                                    ))
                                  ) : (
                                     <SelectItem value="no-codes" disabled>
                                       No {paymentDetails.network} merchant codes available for {wallet?.currency}
                                     </SelectItem>
                                  );
                                })()}
                              </SelectContent>
                         </Select>
                       </div>
                     )}

                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        type="tel"
                        value={paymentDetails.phoneNumber}
                        onChange={(e) => setPaymentDetails(prev => ({
                          ...prev,
                          phoneNumber: e.target.value
                        }))}
                        placeholder="e.g., +256700000000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="transactionId">Transaction ID</Label>
                      <Input
                        id="transactionId"
                        type="text"
                        value={paymentDetails.transactionId}
                        onChange={(e) => setPaymentDetails(prev => ({
                          ...prev,
                          transactionId: e.target.value
                        }))}
                        placeholder="Enter merchant transaction ID"
                      />
                    </div>

                    <div className="p-3 bg-orange-50 rounded">
                      <p className="text-sm text-orange-800">
                        Manual processing - requires admin verification
                      </p>
                    </div>
                  </>
                )}

                {/* RelWorx Fields */}
                {paymentDetails.mobileMoneyType === 'relworx' && (
                  <>
                    {/* Network selection removed - RelWorx auto-detects network */}

                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        type="tel"
                        value={paymentDetails.phoneNumber}
                        onChange={(e) => setPaymentDetails(prev => ({
                          ...prev,
                          phoneNumber: e.target.value
                        }))}
                        placeholder="e.g., +256700000000"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Network will be automatically detected by RelWorx
                      </p>
                    </div>

                    <div className="p-3 bg-blue-50 rounded">
                      <p className="text-sm text-blue-800">
                        STK push will be sent for payment approval via RelWorx gateway
                      </p>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="bank_transfer" className="space-y-4">
              <div className="space-y-4">
                <Alert>
                  <Building className="h-4 w-4" />
                  <AlertDescription>
                    {(() => {
                      const bankAccounts = getBankAccountsForDeposit(wallet?.currency || '');
                      return bankAccounts.length > 0 ? 
                        `${bankAccounts.length} bank account(s) available for deposits` :
                        'No bank accounts configured for this currency';
                    })()}
                  </AlertDescription>
                </Alert>

                {(() => {
                  const bankAccounts = getBankAccountsForDeposit(wallet?.currency || '');
                  return bankAccounts.length > 0 ? (
                    bankAccounts.map((account) => (
                      <div key={account.id} className="p-4 bg-gray-50 rounded mb-3">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          {account.account_name}
                          {account.is_primary && <Badge variant="outline">Primary</Badge>}
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p><strong>Bank:</strong> {account.bank_name}</p>
                          <p><strong>Account Number:</strong> {account.account_number}</p>
                          <p><strong>Account Name:</strong> {account.account_name}</p>
                          <p><strong>Currency:</strong> {account.currency}</p>
                          <p><strong>Reference:</strong> YAWATU-{Date.now()}</p>
                          {account.swift_code && <p><strong>SWIFT:</strong> {account.swift_code}</p>}
                          {account.description && <p><strong>Notes:</strong> {account.description}</p>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 bg-yellow-50 rounded">
                      <p className="text-sm text-yellow-800">
                        No bank accounts configured for {wallet?.currency}. Please contact support.
                      </p>
                    </div>
                  );
                })()}

                <div className="space-y-2">
                  <Label>Upload Payment Proof (Optional)</Label>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setPaymentDetails(prev => ({
                      ...prev,
                      proof: e.target.files?.[0]
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload receipt or proof of your bank transfer
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="credit_card" className="space-y-4">
              <div className="space-y-4">
                <Alert>
                  <CreditCard className="h-4 w-4" />
                  <AlertDescription>
                    Secure credit card processing via encrypted connection
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    value={paymentDetails.cardNumber}
                    onChange={(e) => setPaymentDetails(prev => ({
                      ...prev,
                      cardNumber: e.target.value
                    }))}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input
                      id="expiryDate"
                      value={paymentDetails.expiryDate}
                      onChange={(e) => setPaymentDetails(prev => ({
                        ...prev,
                        expiryDate: e.target.value
                      }))}
                      placeholder="MM/YY"
                      maxLength={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      type="password"
                      value={paymentDetails.cvv}
                      onChange={(e) => setPaymentDetails(prev => ({
                        ...prev,
                        cvv: e.target.value
                      }))}
                      placeholder="123"
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Fee Summary */}
          {feeInfo && amountNum > 0 && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Deposit Amount:</span>
                <span>{wallet?.currency} {amountNum.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Transaction Fee:</span>
                <span>{wallet?.currency} {feeInfo.totalFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-medium border-t pt-2">
                <span>Total:</span>
                <span>{wallet?.currency} {(amountNum + feeInfo.totalFee).toLocaleString()}</span>
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || !selectedWallet || !amount}
          >
            {loading ? 'Processing...' : 'Submit Deposit Request'}
          </Button>
        </form>
      </CardContent>

      <DepositPaymentStatusModal
        open={showPaymentStatusModal}
        onOpenChange={setShowPaymentStatusModal}
        transactionId={currentTransactionId}
        transactionReference={currentTransactionReference}
        onComplete={onDepositComplete}
      />

      {showDepositConfirmation && currentDepositDetails && (
        <DepositConfirmationDialog
          isOpen={showDepositConfirmation}
          onClose={() => setShowDepositConfirmation(false)}
          depositDetails={currentDepositDetails}
        />
      )}
    </Card>
  );
};

export default EnhancedWalletDepositForm;