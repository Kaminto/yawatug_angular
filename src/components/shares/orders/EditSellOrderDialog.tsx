import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';

interface EditSellOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onOrderUpdated: () => void;
}

const EditSellOrderDialog: React.FC<EditSellOrderDialogProps> = ({
  open,
  onOpenChange,
  order,
  onOrderUpdated
}) => {
  const [newQuantity, setNewQuantity] = useState(order?.quantity?.toString() || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpdateQuantity = async () => {
    if (!newQuantity || parseInt(newQuantity) <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    if (parseInt(newQuantity) === order.quantity) {
      setError('New quantity must be different from current quantity');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Use the RPC function to modify sell order quantity
      const { error: updateError } = await supabase.rpc('modify_sell_order_quantity', {
        p_order_id: order.id,
        p_user_id: order.user_id,
        p_new_quantity: parseInt(newQuantity),
        p_reason: 'User modification via Orders tab'
      });

      if (updateError) {
        throw updateError;
      }

      toast.success('Sell order quantity updated successfully');
      onOrderUpdated();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error updating sell order:', err);
      setError(err.message || 'Failed to update order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateNewValue = () => {
    const quantity = parseInt(newQuantity) || 0;
    const price = order.requested_price || order.price_per_share || 0;
    return quantity * price;
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Sell Order</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current order info */}
          <div className="bg-muted p-3 rounded-lg">
            <h4 className="font-medium mb-2">Current Order</h4>
            <div className="text-sm space-y-1">
              <p>Quantity: {order.quantity?.toLocaleString()} shares</p>
              <p>Price: UGX {(order.requested_price || 0).toLocaleString()} per share</p>
              <p>Total Value: UGX {(order.total_sell_value || 0).toLocaleString()}</p>
              <p>Queue Position: #{order.fifo_position || 'N/A'}</p>
            </div>
          </div>
          
          {/* Edit form */}
          <div className="space-y-2">
            <Label htmlFor="quantity">New Quantity</Label>
            <Input
              id="quantity"
              type="number"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              placeholder="Enter new quantity"
              min="1"
              max={order.quantity}
            />
            <p className="text-xs text-muted-foreground">
              Maximum: {order.quantity} shares (your current holdings)
            </p>
          </div>
          
          {/* New value preview */}
          {newQuantity && parseInt(newQuantity) > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-1">Updated Order Preview</h4>
              <div className="text-sm text-blue-800">
                <p>New Quantity: {parseInt(newQuantity).toLocaleString()} shares</p>
                <p>New Total Value: UGX {calculateNewValue().toLocaleString()}</p>
              </div>
            </div>
          )}
          
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Modifying your order may change your queue position. 
              The order will be re-evaluated based on current market conditions.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateQuantity}
            disabled={loading || !newQuantity || parseInt(newQuantity) <= 0}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Update Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditSellOrderDialog;