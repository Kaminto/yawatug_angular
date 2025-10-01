import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTransactionFees } from '@/hooks/useTransactionFees';
import { useEnhancedTransferLimits } from '@/hooks/useEnhancedTransferLimits';
import RecipientEmailVerification from '@/components/shares/RecipientEmailVerification';
import EnhancedUserHoldings from '@/components/shares/EnhancedUserHoldings';

interface EnhancedShareTransferFlowProps {
  userId: string;
  onTransferComplete: () => void;
}

const EnhancedShareTransferFlow: React.FC<EnhancedShareTransferFlowProps> = ({
  userId,
  onTransferComplete
}) => {
  const [selectedShareId, setSelectedShareId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientVerified, setRecipientVerified] = useState(false);
  const [recipientData, setRecipientData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentSharePrice, setCurrentSharePrice] = useState(0);

  const { feeSettings, calculateTransferFee } = useEnhancedTransferLimits();
  const { calculateFee } = useTransactionFees();

  // Get current share price when selection changes
  useEffect(() => {
    const fetchSharePrice = async () => {
      if (!selectedShareId) return;
      
      try {
        const { data, error } = await supabase
          .from('shares')
          .select('price_per_share')
          .eq('id', selectedShareId)
          .single();
        
        if (error) throw error;
        setCurrentSharePrice(data.price_per_share);
      } catch (error) {
        console.error('Error fetching share price:', error);
      }
    };

    fetchSharePrice();
  }, [selectedShareId]);

  const handleTransfer = async (selectedHolding: any) => {
    if (!selectedHolding || !quantity || !recipientData) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (quantity > selectedHolding.quantity) {
      toast.error('Transfer quantity exceeds available shares');
      return;
    }

    if (recipientData.id === userId) {
      toast.error('Cannot transfer to yourself');
      return;
    }

    setLoading(true);
    try {
      const transferValue = quantity * currentSharePrice;
      const feeDetails = calculateTransferFee(quantity, currentSharePrice);

      // Create transfer request and process via edge function
      const { data: transfer, error } = await supabase
        .from('share_transfer_requests')
        .insert({
          sender_id: userId,
          recipient_id: recipientData.id,
          share_id: selectedShareId,
          quantity: quantity,
          status: 'pending',
          reason: 'User initiated transfer',
          transfer_fee: feeDetails.fee,
          share_price: currentSharePrice,
          transfer_value: transferValue
        })
        .select()
        .single();

      if (error) throw error;

      // Process transfer using edge function for reliability
      const { data: processResult, error: processError } = await supabase.functions.invoke(
        'process-share-transfer',
        {
          body: { transferId: transfer.id }
        }
      );

      if (processError) {
        throw new Error(processError.message || 'Failed to process transfer');
      }

      if (processResult?.success) {
        toast.success('Transfer completed successfully! The shares have been transferred.');
      } else {
        toast.error(processResult?.error || 'Transfer processing failed');
      }

      setSelectedShareId('');
      setQuantity(1);
      setRecipientEmail('');
      setRecipientData(null);
      setRecipientVerified(false);
      onTransferComplete();
    } catch (error: any) {
      console.error('Error creating transfer request:', error);
      toast.error(`Failed to create transfer request: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <EnhancedUserHoldings userId={userId}>
      {(holdings, loading: boolean, refreshHoldings) => {
        const directHoldings = holdings.filter(h => h.source === 'direct');
        const selectedHolding = directHoldings.find(h => h.share_id === selectedShareId);
        const availableQuantity = selectedHolding?.quantity || 0;

        return (
          <Card>
            <CardHeader>
              <CardTitle>Transfer Shares</CardTitle>
              <CardDescription>
                Transfer your direct shares to another user (progressive shares cannot be transferred)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Share Selection */}
              <div className="space-y-2">
                <Label htmlFor="share-select">Select Share to Transfer</Label>
                <Select value={selectedShareId} onValueChange={setSelectedShareId} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a share" />
                  </SelectTrigger>
                  <SelectContent>
                    {directHoldings.map((holding) => (
                      <SelectItem key={holding.share_id} value={holding.share_id}>
                        {holding.shares?.name} - {holding.quantity} shares available
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity Input */}
              {selectedHolding && (
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity (max: {availableQuantity})</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max={availableQuantity}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    disabled={loading}
                  />
                </div>
              )}

              {/* Recipient Verification */}
              <RecipientEmailVerification
                email={recipientEmail}
                onEmailChange={setRecipientEmail}
                onRecipientVerified={(recipient) => {
                  setRecipientData(recipient);
                  setRecipientVerified(true);
                }}
              />

              {/* Transfer Summary */}
              {selectedHolding && quantity > 0 && currentSharePrice > 0 && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Transfer Value:</span>
                    <span>UGX {(quantity * currentSharePrice).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Transfer Fee:</span>
                    <span>UGX {calculateTransferFee(quantity, currentSharePrice).fee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium border-t pt-2">
                    <span>Total Cost:</span>
                    <span>UGX {(quantity * currentSharePrice + calculateTransferFee(quantity, currentSharePrice).fee).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button 
                onClick={() => handleTransfer(selectedHolding)} 
                className="w-full"
                disabled={loading || !selectedHolding || !quantity || !recipientVerified}
              >
                {loading ? 'Processing...' : 'Submit Transfer Request'}
              </Button>
            </CardContent>
          </Card>
        );
      }}
    </EnhancedUserHoldings>
  );
};

export default EnhancedShareTransferFlow;