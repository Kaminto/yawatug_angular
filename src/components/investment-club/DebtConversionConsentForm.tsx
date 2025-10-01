import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, Clock, Wallet, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDebtConversionFees, type ConversionEligibility } from '@/hooks/useDebtConversionFees';
import { useWalletOperations } from '@/hooks/useWalletOperations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DebtConversionConsentFormProps {
  clubMember: {
    id: string;
    member_name: string;
    net_balance: number;
    member_code: string;
  };
  onConversionComplete: () => void;
}

export const DebtConversionConsentForm: React.FC<DebtConversionConsentFormProps> = ({
  clubMember,
  onConversionComplete
}) => {
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [conversionFee, setConversionFee] = useState<number>(0);
  const [eligibility, setEligibility] = useState<ConversionEligibility | null>(null);
  const [feePaymentStep, setFeePaymentStep] = useState<'pending' | 'paid'>('pending');
  
  const { 
    loading: feeLoading, 
    calculateConversionFee, 
    checkEligibility, 
    processWalletPayment,
    feeSettings 
  } = useDebtConversionFees();
  
  const { getUserWallets } = useWalletOperations();
  const [userWallets, setUserWallets] = useState<any[]>([]);

  useEffect(() => {
    loadInitialData();
  }, [clubMember.id]);

  const loadInitialData = async () => {
    try {
      // Load conversion fee
      const fee = await calculateConversionFee(clubMember.net_balance);
      setConversionFee(fee);

      // Check eligibility
      const eligibilityData = await checkEligibility(clubMember.id);
      setEligibility(eligibilityData);

      // Set fee payment step based on eligibility
      setFeePaymentStep(eligibilityData.fee_paid ? 'paid' : 'pending');

      // Load user wallets for fee payment
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const wallets = await getUserWallets(user.id);
        setUserWallets(wallets.filter(w => w.currency === 'UGX'));
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Failed to load conversion data');
    }
  };

  const handleFeePayment = async () => {
    if (!selectedWallet) {
      toast.error('Please select a wallet for payment');
      return;
    }

    const selectedWalletData = userWallets.find(w => w.id === selectedWallet);
    if (!selectedWalletData || selectedWalletData.balance < conversionFee) {
      toast.error('Insufficient balance in selected wallet');
      return;
    }

    try {
      const result = await processWalletPayment(
        clubMember.id,
        conversionFee,
        selectedWallet
      );

      if (result.success) {
        setFeePaymentStep('paid');
        // Refresh eligibility after payment
        const updatedEligibility = await checkEligibility(clubMember.id);
        setEligibility(updatedEligibility);
        toast.success('Fee payment completed successfully');
      }
    } catch (error) {
      console.error('Error processing fee payment:', error);
      toast.error('Failed to process fee payment');
    }
  };

  const handleDebtConversion = async () => {
    if (!eligibility?.eligible) {
      toast.error('Conversion requirements not met');
      return;
    }

    try {
      // Create debt conversion agreement with consent
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const sharesToReceive = Math.floor(clubMember.net_balance / eligibility.current_share_price);
      
      const { error } = await supabase
        .from('debt_conversion_agreements')
        .insert({
          club_member_id: clubMember.id,
          debt_amount: clubMember.net_balance,
          shares_to_receive: sharesToReceive,
          conversion_rate: eligibility.current_share_price,
          consent_given: true,
          consent_given_at: new Date().toISOString(),
          fee_paid: true,
          conversion_eligible: true,
          current_share_price_at_agreement: eligibility.current_share_price
        });

      if (error) throw error;

      toast.success('Debt conversion agreement created successfully');
      onConversionComplete();
    } catch (error) {
      console.error('Error creating conversion agreement:', error);
      toast.error('Failed to create conversion agreement');
    }
  };

  const calculateShares = () => {
    if (!eligibility?.current_share_price) return 0;
    return Math.floor(clubMember.net_balance / eligibility.current_share_price);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (!eligibility) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Conversion Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Debt to Share Conversion
          </CardTitle>
          <CardDescription>
            Convert your club debt balance to company shares
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(clubMember.net_balance)}
              </div>
              <div className="text-sm text-muted-foreground">Current Debt</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {calculateShares()}
              </div>
              <div className="text-sm text-muted-foreground">Shares to Receive</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(eligibility.current_share_price)}
              </div>
              <div className="text-sm text-muted-foreground">Price per Share</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Fee Payment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
              1
            </div>
            Conversion Fee Payment
            {feePaymentStep === 'paid' && (
              <Badge variant="default" className="ml-2">
                <CheckCircle className="h-3 w-3 mr-1" />
                Paid
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            A conversion fee of {formatCurrency(conversionFee)} is required to process the conversion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {feePaymentStep === 'pending' && (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  The conversion fee must be paid in cash before you can convert your debt to shares.
                  This fee covers processing and administrative costs.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Select Wallet for Payment</label>
                  <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose wallet" />
                    </SelectTrigger>
                    <SelectContent>
                      {userWallets.map((wallet) => (
                        <SelectItem key={wallet.id} value={wallet.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{wallet.currency} Wallet</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              {formatCurrency(wallet.balance)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleFeePayment}
                  disabled={!selectedWallet || feeLoading}
                  className="w-full"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Pay Conversion Fee ({formatCurrency(conversionFee)})
                </Button>
              </div>
            </>
          )}

          {feePaymentStep === 'paid' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Conversion fee has been paid successfully. You can now proceed with the debt conversion.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Debt Conversion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold ${
              eligibility.eligible ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              2
            </div>
            Accept Conversion Terms
            {eligibility.eligible && (
              <Badge variant="default" className="ml-2">
                <CheckCircle className="h-3 w-3 mr-1" />
                Ready
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Review and accept the terms for converting your debt to shares
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Fee Payment Status:</span>
              <Badge variant={eligibility.fee_paid ? "default" : "secondary"}>
                {eligibility.fee_paid ? "Paid" : "Pending"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Balance Sufficient:</span>
              <Badge variant={eligibility.balance_sufficient ? "default" : "destructive"}>
                {eligibility.balance_sufficient ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Conversion Eligible:</span>
              <Badge variant={eligibility.eligible ? "default" : "destructive"}>
                {eligibility.eligible ? "Yes" : "No"}
              </Badge>
            </div>
          </div>

          {!eligibility.eligible && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {!eligibility.fee_paid && "Please pay the conversion fee first. "}
                {!eligibility.balance_sufficient && "Your debt balance is insufficient for conversion. "}
              </AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleDebtConversion}
            disabled={!eligibility.eligible || feeLoading}
            className="w-full"
            size="lg"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Accept and Convert to Shares
          </Button>
        </CardContent>
      </Card>

      {/* Fee Settings Info */}
      {feeSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Fee Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>Fixed Fee: {formatCurrency(feeSettings.fixed_fee_amount)}</div>
              <div>Percentage Fee: {feeSettings.percentage_fee}%</div>
              <div>Currency: {feeSettings.currency}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};