
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard, Smartphone, Building2, Send, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

interface WalletOperationsProps {
  wallets: any[];
  onOperationComplete: () => void;
}

const EnhancedWalletOperations = ({ wallets, onOperationComplete }: WalletOperationsProps) => {
  const [depositData, setDepositData] = useState({
    wallet_id: '',
    amount: 0,
    payment_method: '',
    phone: '',
    bank: '',
    account_number: '',
    depositor_name: ''
  });

  const [withdrawData, setWithdrawData] = useState({
    wallet_id: '',
    amount: 0,
    payment_method: '',
    phone: '',
    name: '',
    bank_name: '',
    account_number: '',
    swift_code: ''
  });

  const [transferData, setTransferData] = useState({
    from_wallet_id: '',
    recipient_email: '',
    amount: 0,
    purpose: ''
  });

  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recipientExists, setRecipientExists] = useState<boolean | null>(null);

  const handleDeposit = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const wallet = wallets.find(w => w.id === depositData.wallet_id);
      if (!wallet) throw new Error('Wallet not found');

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          wallet_id: depositData.wallet_id,
          amount: depositData.amount,
          transaction_type: 'deposit',
          status: 'completed',
          currency: wallet.currency,
          reference: `Deposit via ${depositData.payment_method}`
        });

      if (transactionError) throw transactionError;

      // Update wallet balance
      const { error: walletError } = await supabase
        .from('wallets')
        .update({
          balance: wallet.balance + depositData.amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', depositData.wallet_id);

      if (walletError) throw walletError;

      toast.success('Deposit completed successfully');
      setDepositData({
        wallet_id: '',
        amount: 0,
        payment_method: '',
        phone: '',
        bank: '',
        account_number: '',
        depositor_name: ''
      });
      setShowPaymentDetails(false);
      onOperationComplete();
    } catch (error: any) {
      toast.error(error.message || 'Failed to process deposit');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const wallet = wallets.find(w => w.id === withdrawData.wallet_id);
      if (!wallet) throw new Error('Wallet not found');

      if (wallet.balance < withdrawData.amount) {
        throw new Error('Insufficient balance');
      }

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          wallet_id: withdrawData.wallet_id,
          amount: -withdrawData.amount,
          transaction_type: 'withdraw',
          status: 'completed',
          currency: wallet.currency,
          reference: `Withdrawal via ${withdrawData.payment_method}`
        });

      if (transactionError) throw transactionError;

      // Update wallet balance
      const { error: walletError } = await supabase
        .from('wallets')
        .update({
          balance: wallet.balance - withdrawData.amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', withdrawData.wallet_id);

      if (walletError) throw walletError;

      toast.success('Withdrawal completed successfully');
      setWithdrawData({
        wallet_id: '',
        amount: 0,
        payment_method: '',
        phone: '',
        name: '',
        bank_name: '',
        account_number: '',
        swift_code: ''
      });
      onOperationComplete();
    } catch (error: any) {
      toast.error(error.message || 'Failed to process withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const verifyRecipient = async (email: string) => {
    if (!email) {
      setRecipientExists(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', email)
        .single();

      setRecipientExists(!!data && !error);
    } catch {
      setRecipientExists(false);
    }
  };

  const handleTransfer = async () => {
    if (!recipientExists) {
      toast.error('Recipient email not found');
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const wallet = wallets.find(w => w.id === transferData.from_wallet_id);
      if (!wallet) throw new Error('Wallet not found');

      if (wallet.balance < transferData.amount) {
        throw new Error('Insufficient balance');
      }

      // Get recipient
      const { data: recipient } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', transferData.recipient_email)
        .single();

      if (!recipient) throw new Error('Recipient not found');

      // Get recipient wallet
      const { data: recipientWallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', recipient.id)
        .eq('currency', wallet.currency)
        .single();

      if (!recipientWallet) throw new Error('Recipient wallet not found');

      // Create transfer transactions
      const { error: senderTransactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          wallet_id: transferData.from_wallet_id,
          amount: -transferData.amount,
          transaction_type: 'transfer',
          status: 'completed',
          currency: wallet.currency,
          reference: `Transfer to ${transferData.recipient_email}: ${transferData.purpose}`
        });

      if (senderTransactionError) throw senderTransactionError;

      const { error: recipientTransactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: recipient.id,
          wallet_id: recipientWallet.id,
          amount: transferData.amount,
          transaction_type: 'transfer',
          status: 'completed',
          currency: wallet.currency,
          reference: `Transfer from ${user.email}: ${transferData.purpose}`
        });

      if (recipientTransactionError) throw recipientTransactionError;

      // Update balances
      await supabase
        .from('wallets')
        .update({ balance: wallet.balance - transferData.amount })
        .eq('id', transferData.from_wallet_id);

      await supabase
        .from('wallets')
        .update({ balance: recipientWallet.balance + transferData.amount })
        .eq('id', recipientWallet.id);

      toast.success('Transfer completed successfully');
      setTransferData({
        from_wallet_id: '',
        recipient_email: '',
        amount: 0,
        purpose: ''
      });
      setRecipientExists(null);
      onOperationComplete();
    } catch (error: any) {
      toast.error(error.message || 'Failed to process transfer');
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentMethodDetails = () => {
    if (!showPaymentDetails) return null;

    if (depositData.payment_method === 'mobile_money') {
      return (
        <div className="space-y-4">
          <div>
            <Label>Mobile Money Service</Label>
            <Select onValueChange={(value) => setDepositData(prev => ({ ...prev, phone: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mtn">MTN Mobile Money (568650, 568654)</SelectItem>
                <SelectItem value="airtel">Airtel Money (1153412, 8053123)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            Please send money to the merchant code and reference your transaction.
          </p>
        </div>
      );
    }

    if (depositData.payment_method === 'bank_transfer') {
      return (
        <div className="space-y-4">
          <div>
            <Label>Bank</Label>
            <Select onValueChange={(value) => setDepositData(prev => ({ ...prev, bank: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dfcu">DFCU Bank (01660013163693)</SelectItem>
                <SelectItem value="equity">Equity Bank (1040102428506)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Depositor Name</Label>
            <Input
              value={depositData.depositor_name}
              onChange={(e) => setDepositData(prev => ({ ...prev, depositor_name: e.target.value }))}
              placeholder="Enter your name as it appears on the deposit"
            />
          </div>
        </div>
      );
    }

    if (depositData.payment_method === 'credit_card') {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Credit card payment integration would be implemented here.
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <Tabs defaultValue="deposit" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="deposit" className="flex items-center gap-2">
          <ArrowDownToLine className="h-4 w-4" />
          Deposit
        </TabsTrigger>
        <TabsTrigger value="withdraw" className="flex items-center gap-2">
          <ArrowUpFromLine className="h-4 w-4" />
          Withdraw
        </TabsTrigger>
        <TabsTrigger value="transfer" className="flex items-center gap-2">
          <Send className="h-4 w-4" />
          Transfer
        </TabsTrigger>
      </TabsList>

      <TabsContent value="deposit">
        <Card>
          <CardHeader>
            <CardTitle>Deposit Funds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Select Wallet</Label>
              <Select value={depositData.wallet_id} onValueChange={(value) => setDepositData(prev => ({ ...prev, wallet_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose wallet" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map(wallet => (
                    <SelectItem key={wallet.id} value={wallet.id}>
                      {wallet.currency} Wallet ({wallet.currency} {wallet.balance.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={depositData.amount || ''}
                onChange={(e) => setDepositData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                placeholder="Enter amount"
              />
            </div>

            <div>
              <Label>Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={depositData.payment_method === 'mobile_money' ? 'default' : 'outline'}
                  onClick={() => {
                    setDepositData(prev => ({ ...prev, payment_method: 'mobile_money' }));
                    setShowPaymentDetails(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <Smartphone className="h-4 w-4" />
                  Mobile Money
                </Button>
                <Button
                  variant={depositData.payment_method === 'bank_transfer' ? 'default' : 'outline'}
                  onClick={() => {
                    setDepositData(prev => ({ ...prev, payment_method: 'bank_transfer' }));
                    setShowPaymentDetails(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <Building2 className="h-4 w-4" />
                  Bank Transfer
                </Button>
                <Button
                  variant={depositData.payment_method === 'credit_card' ? 'default' : 'outline'}
                  onClick={() => {
                    setDepositData(prev => ({ ...prev, payment_method: 'credit_card' }));
                    setShowPaymentDetails(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  Credit Card
                </Button>
              </div>
            </div>

            {renderPaymentMethodDetails()}

            <Button 
              onClick={handleDeposit} 
              disabled={loading || !depositData.wallet_id || !depositData.amount || !depositData.payment_method}
              className="w-full"
            >
              {loading ? 'Processing...' : 'Complete Deposit'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="withdraw">
        <Card>
          <CardHeader>
            <CardTitle>Withdraw Funds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Select Wallet</Label>
              <Select value={withdrawData.wallet_id} onValueChange={(value) => setWithdrawData(prev => ({ ...prev, wallet_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose wallet" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map(wallet => (
                    <SelectItem key={wallet.id} value={wallet.id}>
                      {wallet.currency} Wallet ({wallet.currency} {wallet.balance.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={withdrawData.amount || ''}
                onChange={(e) => setWithdrawData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                placeholder="Enter amount"
              />
            </div>

            <div>
              <Label>Payment Method</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={withdrawData.payment_method === 'mobile_money' ? 'default' : 'outline'}
                  onClick={() => setWithdrawData(prev => ({ ...prev, payment_method: 'mobile_money' }))}
                  className="flex items-center gap-2"
                >
                  <Smartphone className="h-4 w-4" />
                  Mobile Money
                </Button>
                <Button
                  variant={withdrawData.payment_method === 'bank' ? 'default' : 'outline'}
                  onClick={() => setWithdrawData(prev => ({ ...prev, payment_method: 'bank' }))}
                  className="flex items-center gap-2"
                >
                  <Building2 className="h-4 w-4" />
                  Bank Transfer
                </Button>
              </div>
            </div>

            {withdrawData.payment_method === 'mobile_money' && (
              <div className="space-y-4">
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    value={withdrawData.phone}
                    onChange={(e) => setWithdrawData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <Label>Account Name</Label>
                  <Input
                    value={withdrawData.name}
                    onChange={(e) => setWithdrawData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter account holder name"
                  />
                </div>
              </div>
            )}

            {withdrawData.payment_method === 'bank' && (
              <div className="space-y-4">
                <div>
                  <Label>Bank Name</Label>
                  <Input
                    value={withdrawData.bank_name}
                    onChange={(e) => setWithdrawData(prev => ({ ...prev, bank_name: e.target.value }))}
                    placeholder="Enter bank name"
                  />
                </div>
                <div>
                  <Label>Account Number</Label>
                  <Input
                    value={withdrawData.account_number}
                    onChange={(e) => setWithdrawData(prev => ({ ...prev, account_number: e.target.value }))}
                    placeholder="Enter account number"
                  />
                </div>
                <div>
                  <Label>Account Holder Name</Label>
                  <Input
                    value={withdrawData.name}
                    onChange={(e) => setWithdrawData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter account holder name"
                  />
                </div>
                <div>
                  <Label>SWIFT Code (Optional)</Label>
                  <Input
                    value={withdrawData.swift_code}
                    onChange={(e) => setWithdrawData(prev => ({ ...prev, swift_code: e.target.value }))}
                    placeholder="Enter SWIFT code"
                  />
                </div>
              </div>
            )}

            <Button 
              onClick={handleWithdraw} 
              disabled={loading || !withdrawData.wallet_id || !withdrawData.amount || !withdrawData.payment_method}
              className="w-full"
            >
              {loading ? 'Processing...' : 'Complete Withdrawal'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="transfer">
        <Card>
          <CardHeader>
            <CardTitle>Transfer Funds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>From Wallet</Label>
              <Select value={transferData.from_wallet_id} onValueChange={(value) => setTransferData(prev => ({ ...prev, from_wallet_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose wallet" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map(wallet => (
                    <SelectItem key={wallet.id} value={wallet.id}>
                      {wallet.currency} Wallet ({wallet.currency} {wallet.balance.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Recipient Email</Label>
              <Input
                type="email"
                value={transferData.recipient_email}
                onChange={(e) => {
                  setTransferData(prev => ({ ...prev, recipient_email: e.target.value }));
                  verifyRecipient(e.target.value);
                }}
                placeholder="Enter recipient email"
                className={recipientExists === false ? 'border-red-500' : recipientExists === true ? 'border-green-500' : ''}
              />
              {recipientExists === false && (
                <p className="text-sm text-red-600">Email not found in our system</p>
              )}
              {recipientExists === true && (
                <p className="text-sm text-green-600">Recipient verified</p>
              )}
            </div>

            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={transferData.amount || ''}
                onChange={(e) => setTransferData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                placeholder="Enter amount"
              />
            </div>

            <div>
              <Label>Purpose</Label>
              <Textarea
                value={transferData.purpose}
                onChange={(e) => setTransferData(prev => ({ ...prev, purpose: e.target.value }))}
                placeholder="Enter transfer purpose"
              />
            </div>

            <Button 
              onClick={handleTransfer} 
              disabled={loading || !transferData.from_wallet_id || !transferData.amount || !recipientExists}
              className="w-full"
            >
              {loading ? 'Processing...' : 'Complete Transfer'}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default EnhancedWalletOperations;
