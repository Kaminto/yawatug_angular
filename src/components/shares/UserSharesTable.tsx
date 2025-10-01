
import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowRightLeft, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";

interface UserSharesTableProps {
  userShares: any[];
  userId: string | null;
  onShareTransferred: () => void;
}

const UserSharesTable: React.FC<UserSharesTableProps> = ({ userShares, userId, onShareTransferred }) => {
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [selectedShare, setSelectedShare] = useState<any>(null);
  const [transferQuantity, setTransferQuantity] = useState<number>(1);
  const [recipientEmail, setRecipientEmail] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const handleTransferClick = (share: any) => {
    setSelectedShare(share);
    setTransferQuantity(1);
    setRecipientEmail("");
    setIsTransferDialogOpen(true);
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0 && value <= selectedShare?.quantity) {
      setTransferQuantity(value);
    }
  };

  const handleTransfer = async () => {
    if (!userId || !selectedShare) return;
    
    if (transferQuantity <= 0 || transferQuantity > selectedShare.quantity) {
      toast.error("Invalid transfer quantity");
      return;
    }
    
    if (!recipientEmail.trim()) {
      toast.error("Recipient email is required");
      return;
    }
    
    setLoading(true);
    
    try {
      // 1. Find recipient by email
      const { data: recipientData, error: recipientError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', recipientEmail.trim())
        .single();
      
      if (recipientError || !recipientData) {
        toast.error("Recipient not found. Please check the email address.");
        setLoading(false);
        return;
      }
      
      const recipientId = recipientData.id;
      
      if (recipientId === userId) {
        toast.error("Cannot transfer shares to yourself");
        setLoading(false);
        return;
      }
      
      // 2. Check if recipient already has shares of this type
      const { data: existingRecipientShares } = await supabase
        .from('user_shares')
        .select('*')
        .eq('user_id', recipientId)
        .eq('share_id', selectedShare.share_id)
        .single();
      
      // 3. Update sender's shares (reduce quantity)
      const newSenderQuantity = selectedShare.quantity - transferQuantity;
      
      if (newSenderQuantity === 0) {
        // Delete record if no shares left
        const { error: deleteError } = await supabase
          .from('user_shares')
          .delete()
          .eq('id', selectedShare.id);
          
        if (deleteError) throw deleteError;
      } else {
        // Update record with reduced quantity
        const { error: updateError } = await supabase
          .from('user_shares')
          .update({ 
            quantity: newSenderQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedShare.id);
          
        if (updateError) throw updateError;
      }
      
      // 4. Update or create recipient's shares
      if (existingRecipientShares) {
        // Update existing shares
        const newRecipientQuantity = existingRecipientShares.quantity + transferQuantity;
        const newAvgPrice = ((existingRecipientShares.quantity * existingRecipientShares.purchase_price_per_share) + 
                           (transferQuantity * selectedShare.purchase_price_per_share)) / newRecipientQuantity;
        
        const { error: updateRecipientError } = await supabase
          .from('user_shares')
          .update({ 
            quantity: newRecipientQuantity,
            purchase_price_per_share: newAvgPrice,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRecipientShares.id);
          
        if (updateRecipientError) throw updateRecipientError;
      } else {
        // Create new shares for recipient
        const { error: createRecipientError } = await supabase
          .from('user_shares')
          .insert({
            user_id: recipientId,
            share_id: selectedShare.share_id,
            quantity: transferQuantity,
            purchase_price_per_share: selectedShare.purchase_price_per_share,
            currency: selectedShare.currency
          });
          
        if (createRecipientError) throw createRecipientError;
      }
      
      // 5. Create share transaction records
      const { error: transferOutError } = await supabase
        .from('share_transactions')
        .insert({
          user_id: userId,
          share_id: selectedShare.share_id,
          quantity: transferQuantity,
          price_per_share: selectedShare.purchase_price_per_share,
          currency: selectedShare.currency,
          transaction_type: 'transfer_out',
          recipient_id: recipientId
        });
        
      if (transferOutError) throw transferOutError;
      
      const { error: transferInError } = await supabase
        .from('share_transactions')
        .insert({
          user_id: recipientId,
          share_id: selectedShare.share_id,
          quantity: transferQuantity,
          price_per_share: selectedShare.purchase_price_per_share,
          currency: selectedShare.currency,
          transaction_type: 'transfer_in',
          recipient_id: userId
        });
        
      if (transferInError) throw transferInError;
      
      toast.success(`Successfully transferred ${transferQuantity} shares to ${recipientEmail}`);
      setIsTransferDialogOpen(false);
      onShareTransferred();
      
    } catch (error: any) {
      console.error('Error transferring shares:', error);
      toast.error(error.message || 'Failed to transfer shares');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Share Name</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Purchase Price</TableHead>
            <TableHead>Current Value</TableHead>
            <TableHead>Profit/Loss</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {userShares.map((share) => {
            const currentValue = share.quantity * share.shares.price_per_share;
            const purchaseValue = share.quantity * share.purchase_price_per_share;
            const profitLoss = currentValue - purchaseValue;
            const profitLossPercent = (profitLoss / purchaseValue) * 100;
            
            return (
              <TableRow key={share.id}>
                <TableCell className="font-medium">{share.shares.name}</TableCell>
                <TableCell>{share.quantity.toLocaleString()}</TableCell>
                <TableCell>
                  {formatCurrency(share.purchase_price_per_share, share.currency)}
                </TableCell>
                <TableCell>
                  {formatCurrency(currentValue, share.currency)}
                </TableCell>
                <TableCell>
                  <div className={`flex items-center ${profitLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    <TrendingUp className={`h-4 w-4 mr-1 ${profitLoss >= 0 ? '' : 'rotate-180'}`} />
                    {formatCurrency(Math.abs(profitLoss), share.currency)}
                    <span className="ml-1 text-xs">
                      ({profitLossPercent >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%)
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleTransferClick(share)}
                      className="flex items-center text-xs"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                      Transfer
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center text-xs"
                    >
                      <Wallet className="h-3.5 w-3.5 mr-1" />
                      Sell
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Transfer Dialog */}
      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Shares</DialogTitle>
            <DialogDescription>
              Transfer shares to another registered user
            </DialogDescription>
          </DialogHeader>
          
          {selectedShare && (
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <p className="font-medium">{selectedShare.shares.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You own: {selectedShare.quantity} shares
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quantity">Number of Shares to Transfer</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={selectedShare.quantity}
                  value={transferQuantity}
                  onChange={handleQuantityChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient Email</Label>
                <Input
                  id="recipient"
                  type="email"
                  placeholder="Enter email address"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTransferDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={!recipientEmail || transferQuantity <= 0 || loading}
              className="bg-yawatu-gold hover:bg-yawatu-gold-dark text-black"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Transfer Shares
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserSharesTable;
