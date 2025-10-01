
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Send, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTransactionFees } from '@/hooks/useTransactionFees';
import WalletSecurityVerification from './WalletSecurityVerification';

interface WalletTransferFormProps {
  wallets: any[];
  onTransferComplete?: () => void;
}

const WalletTransferForm: React.FC<WalletTransferFormProps> = ({ wallets, onTransferComplete }) => {
  const [formData, setFormData] = useState({
    fromWallet: '',
    recipient: '',
    amount: '',
    purpose: ''
  });
  const [recipientDetails, setRecipientDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [recipientVerified, setRecipientVerified] = useState(false);

  const { getFeeDetails } = useTransactionFees();

  React.useEffect(() => {
    // Wallets are now provided as props
    console.log('Wallets provided as props:', wallets);
  }, [wallets]);

  React.useEffect(() => {
    if (formData.recipient && formData.recipient.length > 3 && formData.fromWallet) {
      const timer = setTimeout(() => {
        verifyRecipient();
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setRecipientDetails(null);
      setRecipientVerified(false);
    }
  }, [formData.recipient, formData.fromWallet]);

  const loadWallets = async () => {
    // This is no longer needed since wallets come as props
    console.log('Wallets provided as props:', wallets);
  };

  const verifyRecipient = async () => {
    if (!formData.recipient) return;

    setVerifying(true);
    try {
      if (!wallet?.currency) {
        setVerifying(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke('verify-recipient', {
        body: {
          email: formData.recipient.includes('@') ? formData.recipient : null,
          phone: !formData.recipient.includes('@') ? formData.recipient : null,
          currency: wallet.currency
        }
      });

      if (error) throw error;

      if (data.success && data.exists && data.verified) {
        setRecipientDetails(data.recipient);
        setRecipientVerified(true);
        toast.success(`Recipient verified: ${data.recipient.full_name}`);
      } else {
        setRecipientDetails(null);
        setRecipientVerified(false);
        if (formData.recipient.length > 5) {
          toast.error(data.message || 'Recipient not found or not verified');
        }
      }
    } catch (error) {
      console.error('Error verifying recipient:', error);
      setRecipientDetails(null);
      setRecipientVerified(false);
      if (formData.recipient.length > 5) {
        toast.error('Failed to verify recipient');
      }
    } finally {
      setVerifying(false);
    }
  };

  const wallet = wallets.find(w => w.id === formData.fromWallet);
  const amountNum = parseFloat(formData.amount) || 0;
  const feeInfo = wallet ? getFeeDetails('transfer', amountNum, wallet.currency) : null;
  const totalAmount = amountNum + (feeInfo?.totalFee || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fromWallet || !formData.recipient || !formData.amount || !recipientVerified) {
      toast.error('Please fill in all required fields and verify recipient');
      return;
    }

    if (!wallet || wallet.balance < totalAmount) {
      toast.error('Insufficient balance including fees');
      return;
    }

    setShowVerification(true);
  };

  const handleVerificationSuccess = async () => {
    setShowVerification(false);
    await processTransfer();
  };

  const processTransfer = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-transfer', {
        body: {
          amount: amountNum,
          currency: wallet.currency,  
          recipientIdentifier: formData.recipient,
          purpose: formData.purpose || `Transfer to ${formData.recipient}`
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Transfer completed successfully!');
        setFormData({
          fromWallet: '',
          recipient: '',
          amount: '',
          purpose: ''
        });
        setRecipientDetails(null);
        setRecipientVerified(false);
        onTransferComplete?.(); // Trigger external refresh
      } else {
        throw new Error(data.error || 'Transfer failed');
      }
    } catch (error: any) {
      console.error('Transfer error:', error);
      toast.error(error.message || 'Failed to process transfer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Transfer Funds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* From Wallet Selection */}
            <div className="space-y-2">
              <Label htmlFor="fromWallet">From Wallet</Label>
              <Select value={formData.fromWallet} onValueChange={(value) => setFormData(prev => ({ ...prev, fromWallet: value }))}>
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

            {/* Recipient */}
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient (Email or Phone)</Label>
              <div className="relative">
                <Input
                  id="recipient"
                  value={formData.recipient}
                  onChange={(e) => setFormData(prev => ({ ...prev, recipient: e.target.value }))}
                  placeholder="Enter email or phone number"
                />
                {verifying && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                  </div>
                )}
                {recipientVerified && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                )}
              </div>
              
              {recipientDetails && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-800">
                      Recipient verified: {recipientDetails.full_name}
                    </span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    {recipientDetails.email} • {recipientDetails.phone}
                  </p>
                </div>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
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

            {/* Purpose */}
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose (Optional)</Label>
              <Textarea
                id="purpose"
                value={formData.purpose}
                onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                placeholder="Enter transfer purpose"
                rows={3}
              />
            </div>

            {/* Fee Summary */}
            {feeInfo && amountNum > 0 && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Transfer Amount:</span>
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
                  <span>Recipient will receive:</span>
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
              disabled={loading || !formData.fromWallet || !formData.recipient || !formData.amount || !recipientVerified || totalAmount > (wallet?.balance || 0)}
            >
              {loading ? 'Processing...' : 'Transfer Funds'}
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
          transactionType="transfer"
          requireOTP={true}
        />
      )}
    </>
  );
};

export default WalletTransferForm;
