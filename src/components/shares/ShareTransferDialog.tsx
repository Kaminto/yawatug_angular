
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertCircle, Send } from 'lucide-react';

interface UserShare {
  id: string;
  user_id: string;
  share_id: string;
  quantity: number;
  shares?: {
    id: string;
    name: string;
    current_price: number;
    currency: string;
  };
}

interface ShareTransferDialogProps {
  userShare: UserShare;
  open: boolean;
  onClose: () => void;
  onTransferComplete: () => void;
}

const ShareTransferDialog: React.FC<ShareTransferDialogProps> = ({
  userShare,
  open,
  onClose,
  onTransferComplete
}) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipientValid, setRecipientValid] = useState(false);
  const [recipientData, setRecipientData] = useState<{ id: string; full_name: string; email: string } | null>(null);

  const validateRecipient = async (email: string) => {
    if (!email) {
      setRecipientValid(false);
      setRecipientData(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', email)
        .single();

      if (error || !data) {
        setRecipientValid(false);
        setRecipientData(null);
        return;
      }

      setRecipientValid(true);
      setRecipientData(data);
    } catch (error) {
      setRecipientValid(false);
      setRecipientData(null);
    }
  };

  const handleTransfer = async () => {
    if (!userShare || !recipientEmail || !quantity || !recipientValid) {
      toast.error('Please fill in all required fields');
      return;
    }

    const transferQuantity = parseInt(quantity);
    if (transferQuantity > userShare.quantity) {
      toast.error('Cannot transfer more shares than you own');
      return;
    }

    setLoading(true);
    try {
      const { data: recipient, error: recipientError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', recipientEmail)
        .single();

      if (recipientError || !recipient) {
        throw new Error('Recipient not found');
      }

      const { error } = await supabase
        .from('share_transfer_requests')
        .insert({
          sender_id: userShare.user_id,
          recipient_id: recipient.id,
          share_id: userShare.share_id,
          quantity: transferQuantity,
          reason,
          status: 'pending',
          share_price: 19900, // Current share price
          transfer_value: transferQuantity * 19900
        });

      if (error) throw error;

      toast.success('Transfer request created successfully');
      onTransferComplete();
      onClose();
    } catch (error: any) {
      console.error('Error creating transfer:', error);
      toast.error(error.message || 'Failed to create transfer request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Shares</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Share Details</Label>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{userShare.shares?.name}</p>
              <p className="text-sm text-muted-foreground">
                Available: {userShare.quantity} shares
              </p>
            </div>
          </div>

          <div>
            <Label>Recipient Email</Label>
            <Input
              type="email"
              value={recipientEmail}
              onChange={(e) => {
                setRecipientEmail(e.target.value);
                validateRecipient(e.target.value);
              }}
              placeholder="Enter recipient email"
            />
            {recipientEmail && !recipientValid && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Recipient email not found in the system
                </AlertDescription>
              </Alert>
            )}
            {recipientData && (
              <Alert className="mt-2">
                <AlertDescription>
                  Recipient found: {recipientData.full_name} ({recipientData.email})
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div>
            <Label>Quantity to Transfer</Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              min="1"
              max={userShare.quantity}
            />
          </div>

          <div>
            <Label>Reason (Optional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for transfer"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleTransfer}
              disabled={loading || !recipientValid || !quantity}
              className="flex-1"
            >
              {loading ? 'Processing...' : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Transfer Shares
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareTransferDialog;
