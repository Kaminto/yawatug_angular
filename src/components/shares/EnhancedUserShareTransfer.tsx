
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowRightLeft, Users, AlertCircle, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { useEnhancedTransferLimits } from '@/hooks/useEnhancedTransferLimits';

interface EnhancedUserShareTransferProps {
  userShares: any[];
  userId: string;
  onTransferComplete: () => void;
}

const EnhancedUserShareTransfer: React.FC<EnhancedUserShareTransferProps> = ({
  userShares,
  userId,
  onTransferComplete
}) => {
  const [selectedShare, setSelectedShare] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [recipientContact, setRecipientContact] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [transferEnabled, setTransferEnabled] = useState(true);
  const [transferFee, setTransferFee] = useState<number>(0);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [recipientFound, setRecipientFound] = useState<boolean | null>(null);
  const [recipientInfo, setRecipientInfo] = useState<any>(null);
  const [transferrableShares, setTransferrableShares] = useState<any[]>([]);
  
  const { 
    feeSettings, 
    loading: feeLoading, 
    calculateTransferFee: calcTransferFee, 
    validateTransfer: validateTransferLimits 
  } = useEnhancedTransferLimits();

  useEffect(() => {
    loadTransferConfiguration();
    loadTransferrableShares();
    if (userShares.length > 0) {
      setSelectedShare(userShares[0].share_id);
    }
  }, [userShares]);

  useEffect(() => {
    if (selectedShare && quantity > 0) {
      calculateTransferFee();
      loadTransferConfiguration(); // Reload to get current price for selected share
    }
  }, [selectedShare, quantity]);

  useEffect(() => {
    if (recipientContact.trim()) {
      validateRecipient();
    } else {
      setRecipientFound(null);
      setRecipientInfo(null);
    }
  }, [recipientContact]);

  const loadTransferConfiguration = async () => {
    try {
      // Load current share price from shares table using selected share
      if (selectedShare) {
        const { data: shareData, error: shareError } = await supabase
          .from('shares')
          .select('price_per_share')
          .eq('id', selectedShare)
          .single();

        if (shareData && !shareError) {
          setCurrentPrice(shareData.price_per_share);
        }
      } else if (userShares.length > 0) {
        // Fallback to first share if no specific selection
        const { data: shareData, error: shareError } = await supabase
          .from('shares')
          .select('price_per_share')
          .eq('id', userShares[0].share_id)
          .single();

        if (shareData && !shareError) {
          setCurrentPrice(shareData.price_per_share);
        }
      }

      // Load transfer settings from trading limits
      const { data: limitsData, error: limitsError } = await supabase
        .from('share_trading_limits')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (limitsData && !limitsError) {
        setTransferEnabled(true);
      }

    } catch (error) {
      console.error('Error loading transfer configuration:', error);
    }
  };

  const loadTransferrableShares = () => {
    // Filter shares that are available for transfer (not locked by pending orders)
    setTransferrableShares(userShares);
  };

  const validateRecipient = async () => {
    try {
      const isEmail = recipientContact.includes('@');
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, phone');

      if (isEmail) {
        query = query.eq('email', recipientContact.trim());
      } else {
        query = query.eq('phone', recipientContact.trim());
      }

      const { data: recipient, error } = await query.single();

      if (error || !recipient) {
        setRecipientFound(false);
        setRecipientInfo(null);
      } else {
        setRecipientFound(true);
        setRecipientInfo(recipient);
      }
    } catch (error) {
      setRecipientFound(false);
      setRecipientInfo(null);
    }
  };

  const calculateTransferFee = () => {
    if (!selectedShareData || !currentPrice) return;
    
    const feeResult = calcTransferFee(quantity, currentPrice);
    setTransferFee(feeResult.fee);
  };

  const selectedShareData = transferrableShares.find(share => share.share_id === selectedShare);

  const validateTransfer = () => {
    if (!transferEnabled) {
      return { valid: false, message: 'Share transfers are currently disabled' };
    }
    
    if (!selectedShareData) {
      return { valid: false, message: 'Please select shares to transfer' };
    }
    
    if (quantity > selectedShareData.quantity) {
      return { valid: false, message: 'Insufficient shares to transfer' };
    }
    
    if (!recipientContact.trim()) {
      return { valid: false, message: 'Recipient email or phone number is required' };
    }
    
    if (recipientFound === false) {
      return { valid: false, message: 'Recipient not found. Please check the email or phone number.' };
    }
    
    if (recipientInfo?.id === userId) {
      return { valid: false, message: 'Cannot transfer shares to yourself' };
    }

    // Enhanced validation using the transfer limits hook
    const transferValidation = validateTransferLimits(quantity, selectedShareData.quantity, currentPrice);
    if (!transferValidation.isValid) {
      return { valid: false, message: transferValidation.reason };
    }
    
    return { valid: true, message: '' };
  };

  const handleTransfer = async () => {
    const validation = validateTransfer();
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    setLoading(true);
    try {
      // Check if user has sufficient wallet balance for transfer fee
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .eq('currency', 'UGX')
        .single();

      if (!wallet || wallet.balance < transferFee) {
        toast.error('Insufficient wallet balance to cover transfer fee');
        return;
      }

      // Create transfer request and process via edge function
      const transferData = {
        sender_id: userId,
        recipient_id: recipientInfo.id,
        share_id: selectedShare,
        quantity,
        transfer_fee: transferFee,
        reason: reason.trim() || null,
        status: 'pending',
        share_price: 19900, // Current share price
        transfer_value: quantity * 19900
      };

      const { data: transfer, error } = await supabase
        .from('share_transfer_requests')
        .insert(transferData)
        .select()
        .single();

      if (error) throw error;

      // Process transfer using edge function
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
      
      // Reset form
      setQuantity(1);
      setRecipientContact('');
      setReason('');
      setRecipientFound(null);
      setRecipientInfo(null);
      
      onTransferComplete();
    } catch (error: any) {
      console.error('Error creating transfer request:', error);
      toast.error('Failed to create transfer request');
    } finally {
      setLoading(false);
    }
  };

  const validation = validateTransfer();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Transfer Shares
        </CardTitle>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span className="text-sm text-muted-foreground">Send shares to other registered users</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!transferEnabled && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Share transfers are currently disabled by admin</AlertDescription>
          </Alert>
        )}

        <div>
          <Label>Available Transferrable Shares</Label>
          <Select value={selectedShare} onValueChange={setSelectedShare}>
            <SelectTrigger>
              <SelectValue placeholder="Select shares" />
            </SelectTrigger>
            <SelectContent>
              {transferrableShares.map((share) => (
                <SelectItem key={share.share_id} value={share.share_id}>
                  {share.shares?.name} - {share.quantity.toLocaleString()} available
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedShareData && (
          <div>
            <Label>Quantity to Transfer</Label>
            <Input
              type="number"
              min="1"
              max={selectedShareData.quantity}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            />
            <p className="text-sm text-muted-foreground mt-1">
              You can transfer: {selectedShareData.quantity.toLocaleString()} shares
            </p>
          </div>
        )}

        <div>
          <Label>Recipient Email or Phone Number</Label>
          <Input
            type="text"
            value={recipientContact}
            onChange={(e) => setRecipientContact(e.target.value)}
            placeholder="recipient@example.com or +256700000000"
          />
          {recipientFound === true && recipientInfo && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Recipient found: {recipientInfo.full_name} ({recipientInfo.email})
              </AlertDescription>
            </Alert>
          )}
          {recipientFound === false && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Recipient not found with this email/phone
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div>
          <Label>Reason for Transfer (Optional)</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Gift, Trade, Family transfer..."
            rows={3}
          />
        </div>

        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between items-center">
            <span>Transfer Value:</span>
            <Badge variant="secondary">
              UGX {(quantity * currentPrice).toLocaleString()}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span>Transfer Fee:</span>
            <Badge variant="outline">
              <DollarSign className="h-3 w-3 mr-1" />
              UGX {transferFee.toLocaleString()}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Transfer fee will be deducted from your UGX wallet
          </p>
        </div>

        {!validation.valid && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validation.message}</AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={handleTransfer} 
          disabled={loading || !validation.valid || transferrableShares.length === 0}
          className="w-full"
        >
          {loading ? 'Processing...' : `Transfer ${quantity} Shares`}
        </Button>
      </CardContent>
    </Card>
  );
};

export default EnhancedUserShareTransfer;
