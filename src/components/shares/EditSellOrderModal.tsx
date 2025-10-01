import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTransactionFees } from '@/hooks/useTransactionFees';

interface EditSellOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellOrder: any;
  onOrderUpdate: () => void;
}

const EditSellOrderModal: React.FC<EditSellOrderModalProps> = ({
  isOpen,
  onClose,
  sellOrder,
  onOrderUpdate
}) => {
  const [quantity, setQuantity] = useState('');
  const [requestedPrice, setRequestedPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const { getFeeDetails } = useTransactionFees();

  useEffect(() => {
    if (sellOrder) {
      setQuantity(sellOrder.quantity?.toString() || '');
      setRequestedPrice(sellOrder.requested_price?.toString() || sellOrder.price_per_share?.toString() || '');
    }
  }, [sellOrder]);

  const handleUpdate = async () => {
    if (!sellOrder || !quantity || !requestedPrice) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newQuantity = parseInt(quantity);
    const newPrice = parseFloat(requestedPrice);

    if (newQuantity <= 0 || newPrice <= 0) {
      toast.error('Quantity and price must be greater than zero');
      return;
    }

    setLoading(true);
    try {
      // Use the proper RPC function for modifying sell orders
      const { error } = await supabase.rpc('modify_sell_order_quantity', {
        p_order_id: sellOrder.id,
        p_user_id: sellOrder.user_id,
        p_new_quantity: newQuantity,
        p_reason: `User modified order: quantity changed from ${sellOrder.quantity} to ${newQuantity}, price changed to UGX ${newPrice}`
      });

      if (error) throw error;

      // If quantity modification succeeded and price is different, update price separately
      if (newPrice !== (sellOrder.requested_price || sellOrder.price_per_share)) {
        const newTotalValue = newQuantity * newPrice;
        
        const { error: priceError } = await supabase
          .from('share_sell_orders')
          .update({
            requested_price: newPrice,
            price_per_share: newPrice,
            total_sell_value: newTotalValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', sellOrder.id)
          .eq('user_id', sellOrder.user_id)
          .eq('status', 'pending');

        if (priceError) throw priceError;
      }

      toast.success('Sell order updated successfully');
      onOrderUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error updating sell order:', error);
      toast.error(`Failed to update sell order: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const totalValue = (parseInt(quantity) || 0) * (parseFloat(requestedPrice) || 0);
  const feeDetails = getFeeDetails('share_sell', totalValue);
  const netAmount = totalValue - (feeDetails?.totalFee || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Sell Order</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              placeholder="Enter quantity"
            />
            <p className="text-xs text-muted-foreground">
              Original: {sellOrder?.quantity?.toLocaleString()} shares
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Requested Price per Share (UGX)</Label>
            <Input
              id="price"
              type="number"
              value={requestedPrice}
              onChange={(e) => setRequestedPrice(e.target.value)}
              min="1"
              placeholder="Enter price per share"
            />
            <p className="text-xs text-muted-foreground">
              Current market price: UGX {(sellOrder?.shares?.price_per_share || 0).toLocaleString()}
            </p>
          </div>

          {totalValue > 0 && (
            <div className="bg-muted p-3 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Value:</span>
                <span>UGX {totalValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Processing Fee:</span>
                <span className="text-red-600">UGX {(feeDetails?.totalFee || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-medium border-t pt-2">
                <span>Net Amount:</span>
                <span>UGX {netAmount.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground p-2 bg-yellow-50 border border-yellow-200 rounded">
            ⚠️ You can only edit pending orders. Modifying the quantity will reset your FIFO queue position.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdate} 
            disabled={loading || !quantity || !requestedPrice}
          >
            {loading ? 'Updating...' : 'Update Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditSellOrderModal;