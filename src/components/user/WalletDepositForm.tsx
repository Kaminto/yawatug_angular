import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard } from 'lucide-react';
import { useTransactionFees } from '@/hooks/useTransactionFees';
import { useAdminPaymentConfigurations } from '@/hooks/useAdminPaymentConfigurations';

interface WalletDepositFormProps {
  wallets: any[];
  onDepositComplete: () => void;
}

const WalletDepositForm: React.FC<WalletDepositFormProps> = ({
  wallets,
  onDepositComplete
}) => {
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [loading, setLoading] = useState(false);
  const { getFeeDetails } = useTransactionFees();
  const { configurations } = useAdminPaymentConfigurations();

  const selectedWallet = wallets.find(w => w.id === selectedWalletId);
  const depositAmount = parseFloat(amount) || 0;
  // Fixed parameter order: transaction type first, then amount
  const feeDetails = getFeeDetails('deposit', depositAmount, selectedWallet?.currency || 'UGX');

  const handleDeposit = async () => {
    if (!selectedWallet || !depositAmount || !paymentMethod) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          wallet_id: selectedWallet.id,
          amount: depositAmount,
          currency: selectedWallet.currency,
          transaction_type: 'deposit',
          status: 'pending',
          admin_notes: JSON.stringify({
            payment_method: paymentMethod,
            transaction_fee: feeDetails.totalFee
          })
        });

      if (error) throw error;

      toast.success('Deposit request submitted successfully');
      setSelectedWalletId('');
      setAmount('');
      setPaymentMethod('');
      onDepositComplete();
    } catch (error: any) {
      console.error('Error creating deposit:', error);
      toast.error(`Failed to create deposit: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
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
            <SelectContent>
              {wallets.map((wallet) => (
                <SelectItem key={wallet.id} value={wallet.id}>
                  {wallet.currency} Wallet
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Amount</Label>
          <Input
            type="number"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            min="0"
          />
        </div>

        <div>
          <Label>Payment Method</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger>
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mobile_money">Mobile Money</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="credit_card">Credit Card</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Show merchant codes for mobile money */}
          {paymentMethod === 'mobile_money' && (
            <>
              <div className="mt-3">
                <Label>Network</Label>
                <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                    <SelectItem value="airtel">Airtel Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {selectedNetwork && (
                <div className="mt-3">
                  <Label>Merchant Code</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select merchant code" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const networkProviderMap = {
                          'mtn': ['MTN', 'mtn'],
                          'airtel': ['Airtel', 'airtel']
                        };
                        
                        const allowedProviders = networkProviderMap[selectedNetwork as keyof typeof networkProviderMap] || [];
                        
                        const availableCodes = configurations?.merchantCodes
                          ?.filter(mc => 
                            mc.currency === selectedWallet?.currency && 
                            mc.is_active && 
                            mc.approval_status === 'approved' &&
                            allowedProviders.some(provider => 
                              mc.provider_name.toLowerCase().includes(provider.toLowerCase())
                            )
                          ) ?? [];
                          
                        return availableCodes.length > 0 ? (
                          availableCodes.map(mc => (
                            <SelectItem key={mc.id} value={mc.merchant_code}>
                              {mc.merchant_code} - {mc.provider_name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-codes" disabled>
                            No {selectedNetwork} merchant codes available for {selectedWallet?.currency}
                          </SelectItem>
                        );
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </div>

        {selectedWallet && depositAmount > 0 && (
          <div className="bg-muted p-3 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Deposit Amount:</span>
              <span>{selectedWallet.currency} {depositAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Transaction Fee:</span>
              <span className="text-red-600">{selectedWallet.currency} {feeDetails.totalFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-medium border-t pt-2">
              <span>Total Amount:</span>
              <span>{selectedWallet.currency} {(depositAmount + feeDetails.totalFee).toLocaleString()}</span>
            </div>
          </div>
        )}

        <Button 
          onClick={handleDeposit} 
          className="w-full"
          disabled={loading || !selectedWalletId || !depositAmount || !paymentMethod}
        >
          {loading ? 'Processing...' : 'Submit Deposit Request'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default WalletDepositForm;
