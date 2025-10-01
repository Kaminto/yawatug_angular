import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, Calculator } from 'lucide-react';

interface PartialProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onProcessed: () => void;
}

const PartialProcessingModal: React.FC<PartialProcessingModalProps> = ({
  isOpen,
  onClose,
  order,
  onProcessed
}) => {
  const [partialQuantity, setPartialQuantity] = useState('');
  const [processingNotes, setProcessingNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const maxQuantity = order?.remaining_quantity || 0;
  const pricePerShare = order?.requested_price || 0;
  const quantity = parseInt(partialQuantity) || 0;
  const totalValue = quantity * pricePerShare;

  const handlePartialProcess = async () => {
    if (!order || quantity <= 0 || quantity > maxQuantity) {
      toast.error('Please enter a valid quantity');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check buyback fund balance
      const { data: adminFund } = await supabase
        .from('admin_sub_wallets')
        .select('balance')
        .eq('wallet_type', 'share_buyback')
        .eq('currency', 'UGX')
        .single();

      if (!adminFund || adminFund.balance < totalValue) {
        toast.error('Insufficient buyback fund balance for this partial processing');
        return;
      }

      // Update order with partial processing
      const newProcessedQuantity = order.processed_quantity + quantity;
      const newRemainingQuantity = order.original_quantity - newProcessedQuantity;
      const newStatus = newRemainingQuantity === 0 ? 'completed' : 'partial';

      const { error: updateError } = await supabase
        .from('share_sell_orders')
        .update({
          processed_quantity: newProcessedQuantity,
          remaining_quantity: newRemainingQuantity,
          status: newStatus,
          last_partial_processing_at: new Date().toISOString(),
          processed_by: user.id,
          processing_notes: processingNotes || 'Partial processing'
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      // Deduct from buyback fund
      const { error: fundError } = await supabase
        .from('admin_sub_wallets')
        .update({
          balance: adminFund.balance - totalValue
        })
        .eq('wallet_type', 'share_buyback')
        .eq('currency', 'UGX');

      if (fundError) throw fundError;

      // Record fund transaction
      const { error: transactionError } = await supabase
        .from('buyback_fund_transactions')
        .insert({
          transaction_type: 'order_payment',
          sell_order_id: order.id,
          amount: totalValue,
          description: `Partial processing - ${quantity} shares`,
          balance_before: adminFund.balance,
          balance_after: adminFund.balance - totalValue,
          authorized_by: user.id,
          authorization_notes: processingNotes
        });

      if (transactionError) throw transactionError;

      // If this is a partial completion, reset FIFO position for remaining order
      if (newRemainingQuantity > 0) {
        // Update the created_at timestamp to move to end of queue
        const { error: fifoError } = await supabase
          .from('share_sell_orders')
          .update({
            created_at: new Date().toISOString()
          })
          .eq('id', order.id);

        if (fifoError) console.warn('Failed to update FIFO position:', fifoError);
      }

      toast.success(`Partially processed ${quantity} shares. ${newRemainingQuantity > 0 ? 'Remaining order moved to end of queue.' : 'Order completed.'}`);
      onProcessed();
      onClose();
    } catch (error: any) {
      console.error('Error processing partial order:', error);
      toast.error(`Failed to process partial order: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPartialQuantity('');
    setProcessingNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Partial Processing
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Summary */}
          <div className="bg-muted p-3 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>User:</span>
              <span>{order?.profiles?.full_name || 'Unknown'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Share:</span>
              <span>{order?.shares?.name || 'Unknown'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Remaining Quantity:</span>
              <Badge variant="outline">{maxQuantity.toLocaleString()}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span>Price per Share:</span>
              <span>UGX {pricePerShare.toLocaleString()}</span>
            </div>
          </div>

          {/* Partial Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="partial-quantity">Quantity to Process</Label>
            <Input
              id="partial-quantity"
              type="number"
              placeholder="Enter quantity"
              value={partialQuantity}
              onChange={(e) => setPartialQuantity(e.target.value)}
              min="1"
              max={maxQuantity}
            />
            <p className="text-xs text-muted-foreground">
              Max: {maxQuantity.toLocaleString()} shares
            </p>
          </div>

          {/* Calculation Display */}
          {quantity > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing Quantity:</span>
                <span>{quantity.toLocaleString()} shares</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Payment Amount:</span>
                <span className="font-medium">UGX {totalValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Remaining After:</span>
                <span>{(maxQuantity - quantity).toLocaleString()} shares</span>
              </div>
            </div>
          )}

          {/* Processing Notes */}
          <div className="space-y-2">
            <Label htmlFor="processing-notes">Processing Notes (Optional)</Label>
            <Textarea
              id="processing-notes"
              placeholder="Add notes about this partial processing..."
              value={processingNotes}
              onChange={(e) => setProcessingNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Warning for remaining orders */}
          {quantity > 0 && quantity < maxQuantity && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Queue Position Reset</span>
              </div>
              <p className="text-sm text-amber-700 mt-1">
                The remaining {(maxQuantity - quantity).toLocaleString()} shares will be moved to the end of the processing queue with a new timestamp.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={handlePartialProcess} 
              disabled={loading || quantity <= 0 || quantity > maxQuantity}
            >
              {loading ? 'Processing...' : `Process ${quantity.toLocaleString()} Shares`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PartialProcessingModal;