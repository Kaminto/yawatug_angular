
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowRightLeft, 
  Repeat, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Calculator
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEnhancedWalletContext } from '@/hooks/useEnhancedWalletContext';
import WalletSecurityVerification from './WalletSecurityVerification';

interface WalletData {
  id: string;
  currency: string;
  balance: number;
  status: string;
}

interface TransactionTemplate {
  id: string;
  name: string;
  type: string;
  amount?: number;
  recipient?: string;
  description?: string;
}

interface SmartValidation {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  suggestions: string[];
}

const SmartTransactionForm: React.FC = () => {
  const { currentUserId, walletAccessLevel, canPerformTransaction } = useEnhancedWalletContext();
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [activeTab, setActiveTab] = useState('deposit');
  const [loading, setLoading] = useState(false);
  const [showSecurityVerification, setShowSecurityVerification] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<any>(null);
  
  // Form states
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  
  // Smart features
  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  const [validation, setValidation] = useState<SmartValidation>({
    isValid: false,
    warnings: [],
    errors: [],
    suggestions: []
  });
  const [realtimeBalance, setRealtimeBalance] = useState<Record<string, number>>({});

  useEffect(() => {
    loadWallets();
    loadTransactionTemplates();
    setupRealtimeBalanceUpdates();
  }, [currentUserId]);

  useEffect(() => {
    validateTransaction();
  }, [selectedWalletId, amount, recipient, activeTab]);

  const loadWallets = async () => {
    if (!currentUserId) return;

    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('status', 'active');

      if (error) throw error;
      setWallets(data || []);
      
      // Initialize realtime balances
      const balances: Record<string, number> = {};
      data?.forEach(wallet => {
        balances[wallet.id] = wallet.balance;
      });
      setRealtimeBalance(balances);
    } catch (error) {
      console.error('Error loading wallets:', error);
      toast.error('Failed to load wallets');
    }
  };

  const loadTransactionTemplates = async () => {
    // Note: Transaction templates will be implemented when the table is created
    console.log('Transaction templates feature coming soon');
  };

  const setupRealtimeBalanceUpdates = () => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('balance-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${currentUserId}`
        },
        (payload) => {
          const updatedWallet = payload.new as WalletData;
          setRealtimeBalance(prev => ({
            ...prev,
            [updatedWallet.id]: updatedWallet.balance
          }));
          
          // Revalidate transaction if balance changed
          validateTransaction();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const validateTransaction = () => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const selectedWallet = wallets.find(w => w.id === selectedWalletId);
    const transactionAmount = parseFloat(amount) || 0;

    // Basic validation
    if (!selectedWalletId) {
      errors.push('Please select a wallet');
    }

    if (!transactionAmount || transactionAmount <= 0) {
      errors.push('Please enter a valid amount');
    }

    if (activeTab === 'transfer' && !recipient) {
      errors.push('Please enter recipient information');
    }

    // Balance and permission checks
    if (selectedWallet && transactionAmount > 0) {
      const currentBalance = realtimeBalance[selectedWallet.id] || selectedWallet.balance;

      if ((activeTab === 'withdraw' || activeTab === 'transfer') && transactionAmount > currentBalance) {
        errors.push('Insufficient balance');
      }

      // Permission checks
      if (!canPerformTransaction(activeTab, transactionAmount)) {
        errors.push(`You don't have permission to perform ${activeTab} transactions of this amount`);
      }

      // Warnings for large amounts
      if (transactionAmount > 1000000) { // 1M UGX
        warnings.push('Large transaction amount - additional verification may be required');
      }

      // Suggestions
      if (activeTab === 'withdraw' && transactionAmount > currentBalance * 0.8) {
        suggestions.push('Consider keeping some balance for future transactions');
      }

      if (activeTab === 'transfer' && !description) {
        suggestions.push('Adding a description helps track your transactions');
      }
    }

    setValidation({
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    });
  };

  const handleSubmit = async () => {
    if (!validation.isValid) {
      toast.error('Please fix validation errors before proceeding');
      return;
    }

    const selectedWallet = wallets.find(w => w.id === selectedWalletId);
    const transactionAmount = parseFloat(amount);

    if (!selectedWallet) return;

    const transactionData = {
      walletId: selectedWallet.id,
      amount: transactionAmount,
      type: activeTab,
      recipient,
      description,
      paymentMethod
    };

    // Check if security verification is required
    const requiresVerification = 
      transactionAmount > 500000 || // 500K UGX
      walletAccessLevel?.permissions.requiresApproval ||
      ['withdraw', 'transfer'].includes(activeTab);

    if (requiresVerification) {
      setPendingTransaction(transactionData);
      setShowSecurityVerification(true);
      return;
    }

    // Proceed with transaction
    await processTransaction(transactionData);
  };

  const processTransaction = async (transactionData: any) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.functions.invoke('process-wallet-transaction', {
        body: {
          userId: user.id,
          ...transactionData
        }
      });

      if (error) throw error;

      toast.success(`${transactionData.type} transaction submitted successfully`);
      
      // Reset form
      setSelectedWalletId('');
      setAmount('');
      setRecipient('');
      setDescription('');
      setPaymentMethod('');
      
      // Reload wallets to get updated balances
      loadWallets();
    } catch (error: any) {
      console.error('Error processing transaction:', error);
      toast.error(error.message || 'Failed to process transaction');
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = (template: TransactionTemplate) => {
    setActiveTab(template.type);
    if (template.amount) setAmount(template.amount.toString());
    if (template.recipient) setRecipient(template.recipient);
    if (template.description) setDescription(template.description);
  };

  const getValidationIcon = () => {
    if (validation.errors.length > 0) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (validation.warnings.length > 0) {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    }
    if (validation.isValid) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Transaction Templates */}
      {templates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {templates.map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate(template)}
                  className="text-xs"
                >
                  {template.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Transaction Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Wallet Transactions</CardTitle>
            {getValidationIcon()}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="deposit" className="flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4" />
                Deposit
              </TabsTrigger>
              <TabsTrigger value="withdraw" className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4" />
                Withdraw
              </TabsTrigger>
              <TabsTrigger value="transfer" className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Transfer
              </TabsTrigger>
              <TabsTrigger value="exchange" className="flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                Exchange
              </TabsTrigger>
            </TabsList>

            <div className="mt-6 space-y-4">
              {/* Wallet Selection */}
              <div>
                <Label>Select Wallet</Label>
                <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map((wallet) => (
                      <SelectItem key={wallet.id} value={wallet.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{wallet.currency} Wallet</span>
                          <Badge variant="outline" className="ml-2">
                            {wallet.currency} {(realtimeBalance[wallet.id] || wallet.balance).toLocaleString()}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount Input with Smart Suggestions */}
              <div>
                <Label>Amount</Label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    step="0.01"
                    min="0"
                  />
                  <Calculator className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* Conditional Fields */}
              {(activeTab === 'transfer' || activeTab === 'withdraw') && (
                <div>
                  <Label>
                    {activeTab === 'transfer' ? 'Recipient Email/Phone' : 'Payment Details'}
                  </Label>
                  <Input
                    placeholder={
                      activeTab === 'transfer' 
                        ? 'Enter recipient email or phone' 
                        : 'Enter payment details'
                    }
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                  />
                </div>
              )}

              {(activeTab === 'deposit' || activeTab === 'withdraw') && (
                <div>
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="card">Credit/Debit Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Description */}
              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  placeholder="Enter transaction description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Validation Messages */}
              {(validation.errors.length > 0 || validation.warnings.length > 0 || validation.suggestions.length > 0) && (
                <div className="space-y-2">
                  {validation.errors.map((error, index) => (
                    <Alert key={`error-${index}`} variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ))}
                  
                  {validation.warnings.map((warning, index) => (
                    <Alert key={`warning-${index}`}>
                      <Clock className="h-4 w-4" />
                      <AlertDescription>{warning}</AlertDescription>
                    </Alert>
                  ))}
                  
                  {validation.suggestions.map((suggestion, index) => (
                    <Alert key={`suggestion-${index}`} className="border-blue-200 bg-blue-50">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">{suggestion}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {/* Submit Button */}
              <Button 
                onClick={handleSubmit}
                disabled={!validation.isValid || loading}
                className="w-full"
              >
                {loading ? 'Processing...' : `Submit ${activeTab}`}
              </Button>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Security Verification Modal */}
      <WalletSecurityVerification
        isOpen={showSecurityVerification}
        onClose={() => {
          setShowSecurityVerification(false);
          setPendingTransaction(null);
        }}
        onVerified={() => {
          if (pendingTransaction) {
            processTransaction(pendingTransaction);
            setPendingTransaction(null);
          }
        }}
        transactionAmount={parseFloat(amount) || 0}
        transactionType={activeTab}
      />
    </div>
  );
};

export default SmartTransactionForm;
