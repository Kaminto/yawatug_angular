
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSingleShareSystem } from '@/hooks/useSingleShareSystem';

interface ShareSellModalProps {
  share: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ShareSellModal: React.FC<ShareSellModalProps> = ({
  share,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const { shareData } = useSingleShareSystem();

  const pricePerShare = shareData?.price_per_share || 0;

  const handleSell = async () => {
    if (!share || quantity <= 0) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const totalAmount = quantity * pricePerShare;

      const { error } = await supabase
        .from('share_transactions')
        .insert({
          user_id: user.id,
          share_id: share.id,
          quantity: quantity,
          price_per_share: pricePerShare,
          total_amount: totalAmount,
          transaction_type: 'sell',
          status: 'completed',
          currency: share.currency || 'UGX'
        });

      if (error) throw error;

      toast.success('Shares sold successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error selling shares:', error);
      toast.error('Failed to sell shares');
    } finally {
      setLoading(false);
    }
  };

  if (!share) return null;

  const totalAmount = quantity * pricePerShare;
  const maxQuantity = share.userQuantity || 1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sell {share.name} Shares</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="quantity">Quantity to Sell</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={maxQuantity}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              You own {maxQuantity} shares
            </p>
          </div>
          
          {/* System Price Display */}
          <div>
            <Label>Price per Share (System)</Label>
            <div className="p-3 bg-muted rounded-lg">
              <span className="text-lg font-semibold">UGX {pricePerShare.toLocaleString()}</span>
              <p className="text-sm text-muted-foreground mt-1">
                Current system price (updated from admin panel)
              </p>
            </div>
          </div>
          
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Total amount:</span>
              <span>UGX {totalAmount.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSell} disabled={loading} className="bg-action-sell hover:bg-action-sell/90 text-white">
              {loading ? 'Processing...' : 'Sell'}
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

export default ShareSellModal;
