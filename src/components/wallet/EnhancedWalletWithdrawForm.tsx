import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Building, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTransactionFees } from '@/hooks/useTransactionFees';
import WalletSecurityVerification from './WalletSecurityVerification';

interface EnhancedWalletWithdrawFormProps {
  wallets: any[];
  onWithdrawComplete: () => void;
}

const EnhancedWalletWithdrawForm: React.FC<EnhancedWalletWithdrawFormProps> = ({
  wallets,
  onWithdrawComplete
}) => {
  console.log('EnhancedWalletWithdrawForm received wallets:', wallets);
  
  const [selectedWallet, setSelectedWallet] = useState('');
  const [amount, setAmount] = useState('');
  const [withdrawalMethod, setWithdrawalMethod] = useState('mobile_money');
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [withdrawalDetails, setWithdrawalDetails] = useState({
    phoneNumber: '',
    accountName: '',
    bankName: '',
    accountNumber: '',
    swiftCode: '',
    mobileMoneyType: '',
    network: ''
  });

  const { getFeeDetails } = useTransactionFees();

  const wallet = wallets.find(w => w.id === selectedWallet);
  const amountNum = parseFloat(amount) || 0;
  const feeInfo = wallet ? getFeeDetails('withdraw', amountNum, wallet.currency) : null;
  const totalAmount = amountNum + (feeInfo?.totalFee || 0);

  const handleVerificationSuccess = async () => {
    setShowVerification(false);
    await processWithdrawal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWallet || !amount || amountNum <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!wallet || wallet.balance < totalAmount) {
      toast.error('Insufficient balance including fees');
      return;
    }

    // Show security verification
    setShowVerification(true);
  };

  const processWithdrawal = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.functions.invoke('process-withdrawal', {
        body: {
          amount: amountNum,
          currency: wallet.currency,
          description: `Withdrawal via ${withdrawalMethod}`
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Withdrawal request submitted successfully!');
        setAmount('');
        setWithdrawalDetails({
          phoneNumber: '',
          accountName: '',
          bankName: '',
          accountNumber: '',
          swiftCode: '',
          mobileMoneyType: '',
          network: ''
        });
        onWithdrawComplete();
      } else {
        const msg = data.message || data.error || 'Withdrawal failed';
        toast.error(msg);
        return;
      }
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      toast.error(error.message || 'Failed to process withdrawal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Withdraw Funds
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
                max={wallet?.balance || 0}
              />
              {wallet && (
                <div className="text-sm text-muted-foreground">
                  Available: {wallet.currency} {wallet.balance.toLocaleString()}
                </div>
              )}
              {feeInfo && amountNum > 0 && (
                <div className="text-sm text-muted-foreground">
                  Transaction fee: {wallet?.currency} {feeInfo.totalFee.toLocaleString()}
                </div>
              )}
            </div>

            {/* Withdrawal Method Tabs */}
            <Tabs value={withdrawalMethod} onValueChange={setWithdrawalMethod}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="mobile_money" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Mobile Money
                </TabsTrigger>
                <TabsTrigger value="bank_transfer" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Bank Transfer
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
                  
                {/* Mobile Money Method - Dropdown Selection */}
                <div className="space-y-2">
                  <Label>Withdrawal Method</Label>
                  <Select 
                    value={withdrawalDetails.mobileMoneyType} 
                    onValueChange={(value) => setWithdrawalDetails(prev => ({...prev, mobileMoneyType: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select withdrawal method" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border shadow-lg z-[9999] min-w-[200px]">
                      <SelectItem value="relworx">
                        <div className="flex items-center gap-3 py-1">
                          <div className="flex-1">
                            <div className="font-medium">Instant Withdraw</div>
                            <div className="text-xs text-muted-foreground">Via RelWorx - Instant processing</div>
                          </div>
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">Instant</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="manual">
                        <div className="flex items-center gap-3 py-1">
                          <div className="flex-1">
                            <div className="font-medium">Manual Withdraw</div>
                            <div className="text-xs text-muted-foreground">Manual processing - Admin verification</div>
                          </div>
                          <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">Manual</Badge>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                  {/* Merchant Code Fields */}
                  {withdrawalDetails.mobileMoneyType === 'merchant_code' && (
                    <>
                      <div className="space-y-2">
                        <Label>Network</Label>
                        <Select 
                          value={withdrawalDetails.network} 
                          onValueChange={(value) => setWithdrawalDetails(prev => ({...prev, network: value}))}
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

                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <Input
                          id="phoneNumber"
                          type="tel"
                          value={withdrawalDetails.phoneNumber}
                          onChange={(e) => setWithdrawalDetails(prev => ({
                            ...prev,
                            phoneNumber: e.target.value
                          }))}
                          placeholder="e.g., +256700000000"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="accountName">Account Name</Label>
                        <Input
                          id="accountName"
                          value={withdrawalDetails.accountName}
                          onChange={(e) => setWithdrawalDetails(prev => ({
                            ...prev,
                            accountName: e.target.value
                          }))}
                          placeholder="Account holder name"
                        />
                      </div>

                      <div className="p-3 bg-orange-50 rounded">
                        <p className="text-sm text-orange-800">
                          Manual processing - requires admin verification
                        </p>
                      </div>
                    </>
                  )}

                  {/* Manual/RelWorx Fields */}
                  {(withdrawalDetails.mobileMoneyType === 'manual' || withdrawalDetails.mobileMoneyType === 'relworx') && (
                    <>
                      {/* Network selection removed - RelWorx auto-detects network */}

                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <Input
                          id="phoneNumber"
                          type="tel"
                          value={withdrawalDetails.phoneNumber}
                          onChange={(e) => setWithdrawalDetails(prev => ({
                            ...prev,
                            phoneNumber: e.target.value
                          }))}
                          placeholder="e.g., +256700000000"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Network will be automatically detected by RelWorx
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="accountName">Account Name</Label>
                        <Input
                          id="accountName"
                          value={withdrawalDetails.accountName}
                          onChange={(e) => setWithdrawalDetails(prev => ({
                            ...prev,
                            accountName: e.target.value
                          }))}
                          placeholder="Account holder name"
                        />
                      </div>

                    <div className="p-3 bg-blue-50 rounded">
                      <p className="text-sm text-blue-800">
                        {withdrawalDetails.mobileMoneyType === 'relworx' 
                          ? 'Funds will be sent to your mobile money account via RelWorx gateway' 
                          : 'Manual processing - requires admin verification'}
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
                      Bank transfers typically take 1-3 business days to process
                    </AlertDescription>
                  </Alert>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        value={withdrawalDetails.bankName}
                        onChange={(e) => setWithdrawalDetails(prev => ({
                          ...prev,
                          bankName: e.target.value
                        }))}
                        placeholder="Bank name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        value={withdrawalDetails.accountNumber}
                        onChange={(e) => setWithdrawalDetails(prev => ({
                          ...prev,
                          accountNumber: e.target.value
                        }))}
                        placeholder="Account number"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountName">Account Name</Label>
                    <Input
                      id="accountName"
                      value={withdrawalDetails.accountName}
                      onChange={(e) => setWithdrawalDetails(prev => ({
                        ...prev,
                        accountName: e.target.value
                      }))}
                      placeholder="Account holder name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="swiftCode">SWIFT Code (Optional)</Label>
                    <Input
                      id="swiftCode"
                      value={withdrawalDetails.swiftCode}
                      onChange={(e) => setWithdrawalDetails(prev => ({
                        ...prev,
                        swiftCode: e.target.value
                      }))}
                      placeholder="SWIFT/BIC code"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Fee Summary */}
            {feeInfo && amountNum > 0 && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Withdrawal Amount:</span>
                  <span>{wallet?.currency} {amountNum.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Transaction Fee:</span>
                  <span>{wallet?.currency} {feeInfo.totalFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-2">
                  <span>Total Deducted:</span>
                  <span>{wallet?.currency} {totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>You will receive:</span>
                  <span>{wallet?.currency} {amountNum.toLocaleString()}</span>
                </div>
              </div>
            )}

            {wallet && totalAmount > wallet.balance && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Insufficient balance. You need {wallet.currency} {totalAmount.toLocaleString()} 
                  but only have {wallet.currency} {wallet.balance.toLocaleString()}.
                </AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !selectedWallet || !amount || totalAmount > (wallet?.balance || 0)}
            >
              {loading ? 'Processing...' : 'Request Withdrawal'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {showVerification && (
        <WalletSecurityVerification
          isOpen={showVerification}
          onClose={() => setShowVerification(false)}
          onVerified={handleVerificationSuccess}
          transactionAmount={amountNum}
          transactionType="withdraw"
          requireOTP={true}
        />
      )}
    </>
  );
};

export default EnhancedWalletWithdrawForm;