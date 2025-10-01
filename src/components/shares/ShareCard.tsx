
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface ShareCardProps {
  share: any;
  userId: string | null;
  wallets: any[];
  onSharePurchased: () => void;
}

const ShareCard: React.FC<ShareCardProps> = ({ share, userId, wallets, onSharePurchased }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedWallet, setSelectedWallet] = useState<string>("");
  const [totalCost, setTotalCost] = useState(share.price_per_share);
  const [hasEnoughFunds, setHasEnoughFunds] = useState(true);

  // Update total cost when quantity changes
  React.useEffect(() => {
    const cost = quantity * share.price_per_share;
    setTotalCost(cost);
    
    // Check if selected wallet has enough funds
    if (selectedWallet) {
      const wallet = wallets.find(w => w.id === selectedWallet);
      if (wallet) {
        setHasEnoughFunds(wallet.balance >= cost);
      }
    }
  }, [quantity, selectedWallet, share.price_per_share, wallets]);

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0 && value <= share.available_shares) {
      setQuantity(value);
    }
  };

  const handlePurchase = async () => {
    if (!userId || !selectedWallet) {
      toast.error("Please select a wallet to proceed");
      return;
    }

    setLoading(true);

    try {
      // Get selected wallet
      const wallet = wallets.find(w => w.id === selectedWallet);
      
      // Check if wallet has enough balance
      if (wallet.balance < totalCost) {
        toast.error("Insufficient funds in selected wallet");
        return;
      }

      // Begin transaction in Supabase
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("User not authenticated");
        return;
      }

      // 1. Update wallet balance
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ 
          balance: wallet.balance - totalCost,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id);

      if (walletError) throw walletError;

      // 2. Create transaction record
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          wallet_id: wallet.id,
          user_id: user.id,
          amount: -totalCost,
          currency: wallet.currency,
          transaction_type: 'share_purchase',
          reference: `Purchase of ${quantity} ${share.name} shares`,
        })
        .select();

      if (transactionError) throw transactionError;

      // 3. Update share available quantity
      const { error: shareError } = await supabase
        .from('shares')
        .update({ 
          available_shares: share.available_shares - quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', share.id);

      if (shareError) throw shareError;

      // 4. Create user share record or update if exists
      const { data: existingShares } = await supabase
        .from('user_shares')
        .select('*')
        .eq('user_id', user.id)
        .eq('share_id', share.id)
        .single();

      if (existingShares) {
        // Update existing user shares
        const newQuantity = existingShares.quantity + quantity;
        const newAvgPrice = ((existingShares.quantity * existingShares.purchase_price_per_share) + 
                           (quantity * share.price_per_share)) / newQuantity;
        
        const { error: userShareUpdateError } = await supabase
          .from('user_shares')
          .update({ 
            quantity: newQuantity,
            purchase_price_per_share: newAvgPrice,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingShares.id);

        if (userShareUpdateError) throw userShareUpdateError;
      } else {
        // Create new user shares entry
        const { error: userShareError } = await supabase
          .from('user_shares')
          .insert({
            user_id: user.id,
            share_id: share.id,
            quantity: quantity,
            purchase_price_per_share: share.price_per_share,
            currency: share.currency
          });

        if (userShareError) throw userShareError;
      }

      // 5. Create share transaction record
      const { error: shareTransactionError } = await supabase
        .from('share_transactions')
        .insert({
          user_id: user.id,
          share_id: share.id,
          transaction_id: transactionData[0].id,
          quantity: quantity,
          price_per_share: share.price_per_share,
          currency: share.currency,
          transaction_type: 'purchase'
        });

      if (shareTransactionError) throw shareTransactionError;

      toast.success(`Successfully purchased ${quantity} shares of ${share.name}`);
      setIsDialogOpen(false);
      onSharePurchased();
      
    } catch (error: any) {
      console.error('Error purchasing shares:', error);
      toast.error(error.message || 'Failed to complete share purchase');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  return (
    <Card className="overflow-hidden border-yawatu-gold/30 dark:bg-black/80 backdrop-blur-sm">
      <CardHeader className="bg-gradient-to-r from-yawatu-gold/10 to-transparent">
        <CardTitle className="text-xl">{share.name}</CardTitle>
        <CardDescription>
          {share.description || 'Invest in the future of YAWATU'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Price per share:</span>
            <span className="font-semibold text-yawatu-gold">
              {formatCurrency(share.price_per_share, share.currency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Available shares:</span>
            <span>{share.available_shares.toLocaleString()}</span>
          </div>
          <Separator />
        </div>
      </CardContent>
      <CardFooter>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-action-buy hover:bg-action-buy/90 text-white">
              Buy Shares
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buy {share.name} Shares</DialogTitle>
              <DialogDescription>
                Purchase shares at the current market price of {formatCurrency(share.price_per_share, share.currency)} per share.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Number of Shares</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={share.available_shares}
                  value={quantity}
                  onChange={handleQuantityChange}
                />
                <p className="text-xs text-gray-500">
                  Max available: {share.available_shares}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="wallet">Select Wallet</Label>
                <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map((wallet) => (
                      <SelectItem key={wallet.id} value={wallet.id}>
                        {wallet.currency} - Balance: {formatCurrency(wallet.balance, wallet.currency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Cost:</span>
                  <span className="font-semibold">
                    {formatCurrency(totalCost, share.currency)}
                  </span>
                </div>
                
                {!hasEnoughFunds && selectedWallet && (
                  <p className="text-sm text-red-500">
                    Insufficient funds in selected wallet
                  </p>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePurchase}
                disabled={!selectedWallet || !hasEnoughFunds || loading}
                className="bg-action-buy hover:bg-action-buy/90 text-white"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Purchase
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
};

export default ShareCard;
