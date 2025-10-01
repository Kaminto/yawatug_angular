
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SharePurchaseModalProps {
  share: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SharePurchaseModal: React.FC<SharePurchaseModalProps> = ({
  share,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [quantity, setQuantity] = useState(10);
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    if (!share || quantity <= 0) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const totalCost = quantity * share.price_per_share;

      const { error } = await supabase
        .from('share_transactions')
        .insert({
          user_id: user.id,
          share_id: share.id,
          quantity: quantity,
          price_per_share: share.price_per_share,
          total_amount: totalCost,
          transaction_type: 'buy',
          status: 'completed',
          currency: share.currency || 'UGX'
        });

      if (error) throw error;

      toast.success('Shares purchased successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error purchasing shares:', error);
      toast.error('Failed to purchase shares');
    } finally {
      setLoading(false);
    }
  };

  if (!share) return null;

  const totalCost = quantity * share.price_per_share;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Purchase {share.name} Shares</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={share.available_shares}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          <div className="text-sm text-gray-600">
            <p>Price per share: {share.price_per_share} {share.currency}</p>
            <p>Total cost: {totalCost} {share.currency}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePurchase} disabled={loading}>
              {loading ? 'Processing...' : 'Purchase'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SharePurchaseModal;
