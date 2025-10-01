import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowRightLeft, CheckCircle, XCircle, AlertTriangle, DollarSign, Share } from 'lucide-react';
import { useShareTransfer } from '@/hooks/useShareTransfer';
import { useTransferFees } from '@/hooks/useTransferFees';
import { useTransferValidation } from '@/hooks/useTransferValidation';
import { useUserSharesBalance } from '@/hooks/useUserSharesBalance';
import { supabase } from '@/integrations/supabase/client';

interface ShareTransferFlowProps {
  userId: string;
  onTransferComplete?: () => void;
}

const ShareTransferFlow: React.FC<ShareTransferFlowProps> = ({
  userId,
  onTransferComplete
}) => {
  const [selectedShareId, setSelectedShareId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [recipientContact, setRecipientContact] = useState('');
  const [reason, setReason] = useState('');
  const [currentSharePrice, setCurrentSharePrice] = useState(0);
  const [recipientData, setRecipientData] = useState<any>(null);
  const [recipientStatus, setRecipientStatus] = useState<'idle' | 'found' | 'not-found'>('idle');

  const { loading: transferLoading, createTransferRequest } = useShareTransfer();
  const { calculateTransferFee, feeSettings } = useTransferFees();
  const { validateRecipient, validateTransfer } = useTransferValidation();
  const { holdings, loading: holdingsLoading, refreshBalance } = useUserSharesBalance(userId);

  // Filter to only direct shares (not progressive)
  const directHoldings = holdings.filter(h => h.shares?.name);

  // Get current share price when selection changes
  useEffect(() => {
    const fetchSharePrice = async () => {
      if (!selectedShareId) return;
      
      try {
        const { data } = await supabase
          .from('shares')
          .select('price_per_share')
          .eq('id', selectedShareId)
          .single();
        
        if (data) {
          setCurrentSharePrice(data.price_per_share);
        }
      } catch (error) {
        console.error('Error fetching share price:', error);
      }
    };

    fetchSharePrice();
  }, [selectedShareId]);

  // Validate recipient when contact changes
  useEffect(() => {
    const checkRecipient = async () => {
      if (!recipientContact.trim()) {
        setRecipientStatus('idle');
        setRecipientData(null);
        return;
      }

      const result = await validateRecipient(recipientContact);
      if (result.found) {
        setRecipientStatus('found');
        setRecipientData(result.recipient);
      } else {
        setRecipientStatus('not-found');
        setRecipientData(null);
      }
    };

    const debounceTimer = setTimeout(checkRecipient, 500);
    return () => clearTimeout(debounceTimer);
  }, [recipientContact, validateRecipient]);

  const selectedHolding = directHoldings.find(h => h.shares?.id === selectedShareId);
  const transferValue = quantity * currentSharePrice;
  const feeCalculation = calculateTransferFee(quantity, currentSharePrice);

  const handleTransfer = async () => {
    if (!selectedHolding || !recipientData || !currentSharePrice) return;

    // Validate transfer
    const validation = await validateTransfer(
      userId,
      recipientData.id,
      selectedShareId,
      quantity,
      transferValue
    );

    if (!validation.isValid) {
      return; // Validation errors will be shown in UI
    }

    try {
      await createTransferRequest({
        shareId: selectedShareId,
        quantity,
        recipientId: recipientData.id,
        reason: reason.trim() || undefined,
        sharePrice: currentSharePrice,
        transferValue,
        transferFee: feeCalculation.fee
      }, userId);

      // Reset form
      setSelectedShareId('');
      setQuantity(1);
      setRecipientContact('');
      setReason('');
      setRecipientData(null);
      setRecipientStatus('idle');
      
      // Refresh user's holdings
      refreshBalance();
      
      onTransferComplete?.();
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const isFormValid = selectedHolding && 
                     quantity > 0 && 
                     quantity <= selectedHolding.quantity && 
                     recipientStatus === 'found' &&
                     recipientData &&
                     currentSharePrice > 0;

  if (holdingsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading your shares...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (directHoldings.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Share className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">No Shares Available</p>
            <p className="text-muted-foreground mb-4">
              You don't have any direct shares available for transfer.
            </p>
            <p className="text-sm text-muted-foreground">
              Progressive shares cannot be transferred until fully paid.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-6 w-6" />
          Transfer Shares
        </CardTitle>
        <CardDescription>
          Send your shares to another registered user. Only direct shares can be transferred.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Share Selection */}
        <div className="space-y-2">
          <Label htmlFor="share-select">Select Share to Transfer</Label>
          <Select value={selectedShareId} onValueChange={setSelectedShareId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a share" />
            </SelectTrigger>
            <SelectContent>
              {directHoldings.map((holding) => (
                <SelectItem key={holding.shares?.id} value={holding.shares?.id || ''}>
                  <div className="flex items-center justify-between w-full">
                    <span>{holding.shares?.name}</span>
                    <Badge variant="secondary" className="ml-2">
                      {holding.quantity} available
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quantity Input */}
        {selectedHolding && (
          <div className="space-y-2">
            <Label htmlFor="quantity">
              Quantity (max: {selectedHolding.quantity.toLocaleString()})
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={selectedHolding.quantity}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              disabled={transferLoading}
            />
          </div>
        )}

        {/* Recipient Input */}
        <div className="space-y-2">
          <Label htmlFor="recipient">Recipient Email or Phone Number</Label>
          <Input
            id="recipient"
            type="text"
            value={recipientContact}
            onChange={(e) => setRecipientContact(e.target.value)}
            placeholder="recipient@example.com or +256700000000"
            disabled={transferLoading}
          />
          
          {/* Recipient Status */}
          {recipientStatus === 'found' && recipientData && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Recipient found: {recipientData.full_name} ({recipientData.email})
              </AlertDescription>
            </Alert>
          )}
          
          {recipientStatus === 'not-found' && recipientContact.trim() && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                No user found with this email or phone number
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Reason Input */}
        <div className="space-y-2">
          <Label htmlFor="reason">Reason for Transfer (Optional)</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Gift, Trade, Family transfer..."
            rows={3}
            disabled={transferLoading}
          />
        </div>

        {/* Transfer Summary */}
        {isFormValid && (
          <>
            <Separator />
            <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Transfer Summary
              </h4>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span>Share:</span>
                  <span className="font-medium">{selectedHolding.shares?.name}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Quantity:</span>
                  <span className="font-medium">{quantity.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Price per Share:</span>
                  <span className="font-medium">UGX {currentSharePrice.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Transfer Value:</span>
                  <span className="font-medium">UGX {transferValue.toLocaleString()}</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Transfer Fee ({feeSettings?.basePercentage}% + UGX {feeSettings?.flatFee.toLocaleString()}):</span>
                  <span className="font-medium text-destructive">
                    UGX {feeCalculation.fee.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>Total Cost:</span>
                  <span>UGX {(transferValue + feeCalculation.fee).toLocaleString()}</span>
                </div>
              </div>
              
              {transferValue > 100000 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    High-value transfers may require admin approval and could take longer to process.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleTransfer}
          disabled={!isFormValid || transferLoading}
          className="w-full"
          size="lg"
        >
          {transferLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing Transfer...
            </>
          ) : (
            <>
              <ArrowRightLeft className="h-5 w-5 mr-2" />
              Transfer {quantity > 0 ? quantity : ''} Share{quantity !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ShareTransferFlow;