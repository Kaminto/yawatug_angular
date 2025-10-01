
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Smartphone, CreditCard, Building2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useRelWorxPayment } from '@/hooks/useRelWorxPayment';
import { useAdminPaymentConfigurations } from '@/hooks/useAdminPaymentConfigurations';

interface EnhancedPaymentMethodSelectorProps {
  type: 'deposit' | 'withdraw';
  currency: 'UGX' | 'KES' | 'TZS';
  amount: number;
  onMethodSelect: (method: string, details: any) => void;
  onCancel: () => void;
}

const EnhancedPaymentMethodSelector: React.FC<EnhancedPaymentMethodSelectorProps> = ({
  type,
  currency,
  amount,
  onMethodSelect,
  onCancel
}) => {
  const [selectedMethod, setSelectedMethod] = useState('');
  const [formData, setFormData] = useState<any>({});
  const { processMobileMoneyPayment, loading: relworxLoading } = useRelWorxPayment();
  const { configurations } = useAdminPaymentConfigurations();

  const handleSubmit = async () => {
    if (!selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }

    // Validate required fields based on method
    if (selectedMethod === 'mobile_money') {
      if (!formData.mobileMoneyType) {
        toast.error('Please select a mobile money option');
        return;
      }

      if (!formData.phone) {
        toast.error('Please provide your phone number');
        return;
      }

      // Handle RelWorx instant confirmation
      if (formData.mobileMoneyType === 'relworx') {
        const result = await processMobileMoneyPayment({
          amount,
          currency,
          phone: formData.phone,
          network: 'mtn' as 'mtn' | 'airtel' | 'mpesa' | 'tigo', // Default network
          transactionType: type,
          description: `${type} via Mobile Money - RelWorx`
        });

        if (result.success) {
          onMethodSelect(selectedMethod, { ...formData, relworxData: result.data });
        }
        return;
      }

      // Handle merchant code manual processing
      if (formData.mobileMoneyType === 'merchant_code') {
        if (!formData.merchantCode) {
          toast.error('Please select a merchant code');
          return;
        }

        if (type === 'deposit' && (!formData.transactionId || !formData.depositorName)) {
          toast.error('Please provide transaction ID and depositor name for deposits');
          return;
        }

        onMethodSelect(selectedMethod, { ...formData, processingType: 'manual' });
        return;
      }
    } else if (selectedMethod === 'bank_transfer') {
      if (type === 'withdraw' && (!formData.bankName || !formData.accountNumber || !formData.accountName)) {
        toast.error('Please fill in all required fields');
        return;
      }
      if (type === 'deposit' && !formData.depositorName) {
        toast.error('Please provide depositor name');
        return;
      }
    } else if (selectedMethod === 'credit_card') {
      if (!formData.cardNumber || !formData.expiryDate || !formData.cvv || !formData.cardholderName) {
        toast.error('Please fill in all credit card details');
        return;
      }
    }

    onMethodSelect(selectedMethod, formData);
  };

  const getAvailableMethods = () => {
    const methods = [];

    // Mobile Money - Multi-currency support
    if (['UGX', 'KES', 'TZS'].includes(currency)) {
      const getDescription = () => {
        switch (currency) {
          case 'UGX': return 'MTN Mobile Money / Airtel Money';
          case 'KES': return 'M-Pesa / Airtel Money';
          case 'TZS': return 'M-Pesa / Airtel Money / Tigo Pesa';
          default: return 'Mobile Money';
        }
      };

      methods.push({
        id: 'mobile_money',
        name: 'Mobile Money',
        icon: Smartphone,
        description: getDescription(),
        supported: ['deposit', 'withdraw'],
        currencies: ['UGX', 'KES', 'TZS']
      });
    }

    // Bank Transfer - Both currencies
    methods.push({
      id: 'bank_transfer',
      name: 'Bank Transfer',
      icon: Building2,
      description: 'DFCU Bank, Equity Bank',
      supported: ['deposit', 'withdraw'],
      currencies: ['UGX', 'USD']
    });

    // Credit Card - Both currencies, deposit only
    if (type === 'deposit') {
      methods.push({
        id: 'credit_card',
        name: 'Credit Card',
        icon: CreditCard,
        description: 'Visa, Mastercard, American Express',
        supported: ['deposit'],
        currencies: ['UGX', 'USD']
      });
    }

    return methods.filter(method => 
      method.supported.includes(type) && 
      method.currencies.includes(currency)
    );
  };

  const renderMethodForm = () => {
    switch (selectedMethod) {
      case 'mobile_money':
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Choose Mobile Money Option</Label>
              <div className="grid grid-cols-1 gap-3 mt-2">
                <Card 
                  className={`cursor-pointer transition-colors ${
                    formData.mobileMoneyType === 'merchant_code' ? 'ring-2 ring-primary' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setFormData({...formData, mobileMoneyType: 'merchant_code'})}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <h4 className="font-medium">Merchant Codes (Manual)</h4>
                        <p className="text-sm text-muted-foreground">
                          Use MTN MoMo or Airtel Pay merchant codes
                        </p>
                        <Badge variant="outline" className="text-xs mt-1">
                          Manual Processing
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-colors ${
                    formData.mobileMoneyType === 'relworx' ? 'ring-2 ring-primary' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setFormData({...formData, mobileMoneyType: 'relworx'})}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <h4 className="font-medium">RelWorx Instant</h4>
                        <p className="text-sm text-muted-foreground">
                          Instant confirmation via RelWorx gateway
                        </p>
                        <Badge variant="outline" className="text-xs mt-1">
                          Instant Processing
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {formData.mobileMoneyType === 'merchant_code' && (
              <>
                  {/* Network selection removed - RelWorx auto-detects network */}

                <div>
                  <Label>Merchant Code</Label>
                  <Select 
                    value={formData.merchantCode} 
                    onValueChange={(value) => setFormData({...formData, merchantCode: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select merchant code" />
                    </SelectTrigger>
                    <SelectContent>
                      {configurations.merchantCodes
                        .filter(mc => mc.currency === currency && mc.is_active)
                        .map(mc => (
                          <SelectItem key={mc.id} value={mc.merchant_code}>
                            {mc.merchant_code} ({mc.provider_name})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Network will be auto-detected from the merchant code
                  </p>
                </div>

                <div>
                  <Label>Phone Number</Label>
                  <Input
                    type="tel"
                    placeholder="0701234567"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>

                {type === 'deposit' && (
                  <>
                    <div>
                      <Label>Transaction ID</Label>
                      <Input
                        type="text"
                        placeholder="Enter transaction ID"
                        value={formData.transactionId || ''}
                        onChange={(e) => setFormData({...formData, transactionId: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Depositor's Name</Label>
                      <Input
                        type="text"
                        placeholder="Enter depositor's full name"
                        value={formData.depositorName || ''}
                        onChange={(e) => setFormData({...formData, depositorName: e.target.value})}
                      />
                    </div>
                  </>
                )}

                <div className="p-3 bg-orange-50 rounded">
                  <p className="text-sm text-orange-800">
                    Manual processing - requires admin verification
                  </p>
                </div>
              </>
            )}

            {formData.mobileMoneyType === 'relworx' && (
              <>
                  {/* Network selection removed - RelWorx auto-detects network */}

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

                <div className="p-3 bg-blue-50 rounded">
                  <p className="text-sm text-blue-800">
                    {type === 'deposit' 
                      ? 'STK push will be sent for payment approval via RelWorx gateway'
                      : 'Funds will be sent to your mobile money account via RelWorx gateway'
                    }
                  </p>
                </div>
              </>
            )}
          </div>
        );

      case 'bank_transfer':
        if (type === 'deposit') {
          return (
            <div className="space-y-4">
              <div>
                <Label>Select Bank</Label>
                <Select
                  value={formData.selectedBank}
                  onValueChange={(value) => setFormData({...formData, selectedBank: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dfcu">DFCU Bank</SelectItem>
                    <SelectItem value="equity">Equity Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.selectedBank && (
                <div className="p-4 bg-gray-50 rounded">
                  <h4 className="font-medium mb-2">Bank Account Details</h4>
                  <div className="space-y-1 text-sm">
                    {formData.selectedBank === 'dfcu' ? (
                      <>
                        <p><strong>Bank:</strong> DFCU Bank</p>
                        <p><strong>Account Number:</strong> 01660013163693</p>
                        <p><strong>Account Name:</strong> Yawatu Limited</p>
                      </>
                    ) : (
                      <>
                        <p><strong>Bank:</strong> Equity Bank</p>
                        <p><strong>Account Number:</strong> 1040102428506</p>
                        <p><strong>Account Name:</strong> Yawatu Limited</p>
                      </>
                    )}
                    <p><strong>Currency:</strong> {currency}</p>
                    <p><strong>Reference:</strong> YAWATU-{Date.now()}</p>
                  </div>
                </div>
              )}

              <div>
                <Label>Depositor's Name</Label>
                <Input
                  type="text"
                  placeholder="Enter depositor's full name"
                  value={formData.depositorName || ''}
                  onChange={(e) => setFormData({...formData, depositorName: e.target.value})}
                />
              </div>

              <div>
                <Label>Upload Payment Proof</Label>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setFormData({...formData, proof: e.target.files?.[0]})}
                  />
                  <Upload className="h-4 w-4 text-gray-400" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload bank receipt or transaction confirmation
                </p>
              </div>
            </div>
          );
        } else {
          return (
            <div className="space-y-4">
              <div>
                <Label>Bank Name</Label>
                <Select
                  value={formData.bankName}
                  onValueChange={(value) => setFormData({...formData, bankName: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dfcu">DFCU Bank</SelectItem>
                    <SelectItem value="equity">Equity Bank</SelectItem>
                    <SelectItem value="centenary">Centenary Bank</SelectItem>
                    <SelectItem value="stanbic">Stanbic Bank</SelectItem>
                    <SelectItem value="absa">Absa Bank</SelectItem>
                  </SelectContent>
                </Select>
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
              <div className="p-3 bg-yellow-50 rounded">
                <p className="text-sm text-yellow-800">
                  Processing time: 1-3 business days
                </p>
              </div>
            </div>
          );
        }

      case 'credit_card':
        return (
          <div className="space-y-4">
            <div>
              <Label>Cardholder Name</Label>
              <Input
                placeholder="Full name as on card"
                value={formData.cardholderName || ''}
                onChange={(e) => setFormData({...formData, cardholderName: e.target.value})}
              />
            </div>
            <div>
              <Label>Card Number</Label>
              <Input
                placeholder="1234 5678 9012 3456"
                value={formData.cardNumber || ''}
                onChange={(e) => {
                  // Format card number with spaces
                  const value = e.target.value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
                  if (value.replace(/\s/g, '').length <= 16) {
                    setFormData({...formData, cardNumber: value});
                  }
                }}
                maxLength={19}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Expiry Date</Label>
                <Input
                  placeholder="MM/YY"
                  value={formData.expiryDate || ''}
                  onChange={(e) => {
                    // Format as MM/YY
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length >= 2) {
                      value = value.substring(0, 2) + '/' + value.substring(2, 4);
                    }
                    setFormData({...formData, expiryDate: value});
                  }}
                  maxLength={5}
                />
              </div>
              <div>
                <Label>CVV</Label>
                <Input
                  placeholder="123"
                  type="password"
                  value={formData.cvv || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 4) {
                      setFormData({...formData, cvv: value});
                    }
                  }}
                  maxLength={4}
                />
              </div>
            </div>
            <div>
              <Label>Billing Address</Label>
              <Input
                placeholder="Street address"
                value={formData.billingAddress || ''}
                onChange={(e) => setFormData({...formData, billingAddress: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>City</Label>
                <Input
                  placeholder="City"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                />
              </div>
              <div>
                <Label>Postal Code</Label>
                <Input
                  placeholder="Postal code"
                  value={formData.postalCode || ''}
                  onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
                />
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded">
              <p className="text-sm text-blue-800">
                🔒 Your card details are secured with 256-bit SSL encryption
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const availableMethods = getAvailableMethods();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {type === 'deposit' ? 'Deposit' : 'Withdraw'} {amount.toLocaleString()} {currency}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Method Selection */}
        <div>
          <Label className="text-base font-medium">Select Payment Method</Label>
          <div className="grid grid-cols-1 gap-3 mt-2">
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

export default EnhancedPaymentMethodSelector;
