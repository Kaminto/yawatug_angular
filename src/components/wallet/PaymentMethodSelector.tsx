
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Smartphone, CreditCard, Building2, ArrowRightLeft, Coins, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRelWorxPayment } from '@/hooks/useRelWorxPayment';
import { useAdminPaymentConfigurations } from '@/hooks/useAdminPaymentConfigurations';

interface PaymentMethodSelectorProps {
  type: 'deposit' | 'withdraw';
  currency: 'UGX' | 'KES' | 'TZS';
  amount: number;
  onMethodSelect: (method: string, details: any) => void;
  onCancel: () => void;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  type,
  currency,
  amount,
  onMethodSelect,
  onCancel
}) => {
  const [selectedMethod, setSelectedMethod] = useState('');
  const [formData, setFormData] = useState<any>({});
  const { processMobileMoneyPayment, loading: relworxLoading } = useRelWorxPayment();
  const { 
    configurations, 
    loading: configLoading, 
    getAvailablePaymentMethods, 
    getPaymentLimits,
    getBankAccountsForDeposit 
  } = useAdminPaymentConfigurations();

  const handleSubmit = async () => {
    if (!selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }

    // Validate required fields based on method
    if (selectedMethod === 'mobile_money') {
      if (!formData.phone) {
        toast.error('Please provide your phone number');
        return;
      }

      // Process RelWorx payment for mobile money (network auto-detected)
      const result = await processMobileMoneyPayment({
        amount,
        currency,
        phone: formData.phone,
        network: 'mtn' as 'mtn' | 'airtel' | 'mpesa' | 'tigo', // Default network
        transactionType: type,
        description: `${type} via Mobile Money`
      });

      if (result.success) {
        onMethodSelect(selectedMethod, { ...formData, relworxData: result.data });
      }
      return;
    } else if (selectedMethod === 'bank_transfer') {
      if (type === 'withdraw' && (!formData.bankName || !formData.accountNumber || !formData.accountName)) {
        toast.error('Please fill in all required fields');
        return;
      }
    } else if (selectedMethod === 'card') {
      if (!formData.cardNumber || !formData.expiryDate || !formData.cvv) {
        toast.error('Please fill in all required fields');
        return;
      }
    } else if (selectedMethod === 'crypto') {
      if (!formData.walletAddress) {
        toast.error('Please provide wallet address');
        return;
      }
    }

    onMethodSelect(selectedMethod, formData);
  };

  const getAvailableMethods = () => {
    if (configLoading) return [];
    
    const adminMethods = getAvailablePaymentMethods(currency, type);
    const methods = [];

    // Convert admin configurations to UI format
    adminMethods.forEach(method => {
      if (method.type === 'mobile_money') {
        methods.push({
          id: method.id,
          name: method.name,
          icon: Smartphone,
          description: method.provider === 'relworx' ? 
            'Powered by RelWorx Gateway' : 
            `Merchant Code: ${method.config?.merchant_code || 'N/A'}`,
          supported: method.supported,
          currencies: method.currencies,
          config: method.config,
          provider: method.provider
        });
      } else if (method.type === 'bank_transfer') {
        methods.push({
          id: method.id,
          name: method.name,
          icon: Building2,
          description: `${method.accounts?.length || 0} account(s) available`,
          supported: method.supported,
          currencies: method.currencies,
          accounts: method.accounts
        });
      }
    });

    // Add card payments for deposits (if no admin restriction)
    if (type === 'deposit' && ['UGX', 'KES', 'TZS'].includes(currency)) {
      methods.push({
        id: 'card',
        name: 'Card Payment',
        icon: CreditCard,
        description: 'Visa, MasterCard, American Express',
        supported: ['deposit'],
        currencies: [currency]
      });
    }

    return methods;
  };

  const renderMethodForm = () => {
    switch (selectedMethod) {
      case 'mobile_money':
        return (
          <div className="space-y-4">
            <div>
              <Label>Phone Number</Label>
              <Input
                type="tel"
                placeholder="0701234567"
                value={formData.phone || ''}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Network will be automatically detected by RelWorx
              </p>
            </div>
            {type === 'deposit' && (
              <div className="p-3 bg-blue-50 rounded">
                <p className="text-sm text-blue-800">
                  You will receive an STK push to approve the payment. This payment is processed via RelWorx gateway.
                </p>
              </div>
            )}
            {type === 'withdraw' && (
              <div className="p-3 bg-green-50 rounded">
                <p className="text-sm text-green-800">
                  Funds will be sent to your mobile money account via RelWorx gateway.
                </p>
              </div>
            )}
          </div>
        );

      case 'bank_transfer':
        if (type === 'deposit') {
          const bankAccounts = getBankAccountsForDeposit(currency);
          return (
            <div className="space-y-4">
              {bankAccounts.length > 0 ? (
                bankAccounts.map((account, index) => (
                  <div key={account.id} className="p-4 bg-gray-50 rounded">
                    <h4 className="font-medium mb-2">
                      {account.account_name} {account.is_primary && <Badge variant="outline">Primary</Badge>}
                    </h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Bank:</strong> {account.bank_name}</p>
                      <p><strong>Account Number:</strong> {account.account_number}</p>
                      <p><strong>Account Name:</strong> {account.account_name}</p>
                      <p><strong>Currency:</strong> {account.currency}</p>
                      <p><strong>Reference:</strong> YAWATU-{Date.now()}</p>
                      {account.swift_code && <p><strong>SWIFT:</strong> {account.swift_code}</p>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-yellow-50 rounded">
                  <p className="text-sm text-yellow-800">
                    No bank accounts configured for {currency}. Please contact admin.
                  </p>
                </div>
              )}
              <div>
                <Label>Upload Payment Proof (Optional)</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setFormData({...formData, proof: e.target.files?.[0]})}
                />
              </div>
            </div>
          );
        } else {
          return (
            <div className="space-y-4">
              <div>
                <Label>Bank Name</Label>
                <Input
                  placeholder="e.g., Centenary Bank"
                  value={formData.bankName || ''}
                  onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input
                  placeholder="Account number"
                  value={formData.accountNumber || ''}
                  onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
                />
              </div>
              <div>
                <Label>Account Holder Name</Label>
                <Input
                  placeholder="Full name as on account"
                  value={formData.accountName || ''}
                  onChange={(e) => setFormData({...formData, accountName: e.target.value})}
                />
              </div>
            </div>
          );
        }

      case 'card':
        return (
          <div className="space-y-4">
            <div>
              <Label>Card Number</Label>
              <Input
                placeholder="1234 5678 9012 3456"
                value={formData.cardNumber || ''}
                onChange={(e) => setFormData({...formData, cardNumber: e.target.value})}
                maxLength={19}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Expiry Date</Label>
                <Input
                  placeholder="MM/YY"
                  value={formData.expiryDate || ''}
                  onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                  maxLength={5}
                />
              </div>
              <div>
                <Label>CVV</Label>
                <Input
                  placeholder="123"
                  value={formData.cvv || ''}
                  onChange={(e) => setFormData({...formData, cvv: e.target.value})}
                  maxLength={4}
                />
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <p className="text-sm text-green-800">
                Your card details are secured by our payment provider
              </p>
            </div>
          </div>
        );

      case 'crypto':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded">
              <h4 className="font-medium mb-2">USDT Deposit Address</h4>
              <div className="space-y-2">
                <p className="text-sm font-mono bg-white p-2 rounded border">
                  TQrZ8tKfjYnkmqJvjqN8VWAqJkMtRzJqNa
                </p>
                <p className="text-xs text-gray-600">
                  Network: TRC20 (Tron) - Please ensure you send USDT on TRC20 network only
                </p>
              </div>
            </div>
            <div>
              <Label>Your Wallet Address (for refunds)</Label>
              <Input
                placeholder="Your USDT wallet address"
                value={formData.walletAddress || ''}
                onChange={(e) => setFormData({...formData, walletAddress: e.target.value})}
              />
            </div>
            <div className="p-3 bg-yellow-50 rounded">
              <p className="text-sm text-yellow-800">
                Deposit will be credited after 3 network confirmations (usually 5-10 minutes)
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const availableMethods = getAvailableMethods();

  if (configLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading payment methods...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {type === 'deposit' ? 'Deposit' : 'Withdraw'} {amount.toLocaleString()} {currency}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {availableMethods.length} payment method(s) available
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Method Selection */}
        <div>
          <Label className="text-base font-medium">Select Payment Method</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {availableMethods.map((method) => {
              const Icon = method.icon;
              return (
                <Card 
                  key={method.id}
                  className={`cursor-pointer transition-colors ${
                    selectedMethod === method.id ? 'ring-2 ring-primary' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedMethod(method.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Icon className="h-6 w-6" />
                      <div className="flex-1">
                        <h4 className="font-medium">{method.name}</h4>
                        <p className="text-sm text-muted-foreground">{method.description}</p>
                        <div className="flex gap-1 mt-1">
                          {method.currencies.map(curr => (
                            <Badge key={curr} variant="outline" className="text-xs">
                              {curr}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Method Form */}
        {selectedMethod && (
          <div>
            <Label className="text-base font-medium">Payment Details</Label>
            <div className="mt-2">
              {renderMethodForm()}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedMethod || relworxLoading}
          >
            {relworxLoading ? 'Processing...' : 'Continue'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentMethodSelector;
