
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShoppingCart, DollarSign, TrendingUp } from 'lucide-react';
import ShareBuyingValidator from '@/components/shares/ShareBuyingValidator';
import { ShareData, ShareBuyingLimits } from '@/types/custom';

interface EnhancedSharePurchaseFlowProps {
  shareData: ShareData;
  onUpdate: () => void;
}

const EnhancedSharePurchaseFlow: React.FC<EnhancedSharePurchaseFlowProps> = ({ shareData, onUpdate }) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [users, setUsers] = useState<any[]>([]);
  const [buyingLimits, setBuyingLimits] = useState<ShareBuyingLimits | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
    loadBuyingLimits();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadUserProfile(selectedUser);
      loadUserWallet(selectedUser);
    }
  }, [selectedUser]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, account_type')
        .eq('status', 'active')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    }
  };

  const loadBuyingLimits = async () => {
    try {
      const { data, error } = await supabase
        .from('share_buying_limits')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setBuyingLimits({
          ...data,
          account_type: data.account_type as 'individual' | 'organisation' | 'business'
        });
      }
    } catch (error) {
      console.error('Error loading buying limits:', error);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadUserWallet = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .eq('currency', shareData.currency)
        .single();

      if (error) throw error;
      setWalletBalance(data.balance || 0);
    } catch (error) {
      console.error('Error loading user wallet:', error);
      setWalletBalance(0);
    }
  };

  const handlePurchase = async () => {
    if (!selectedUser || !userProfile) {
      toast.error('Please select a user');
      return;
    }

    try {
      setLoading(true);
      
      const totalAmount = quantity * shareData.price_per_share;

      // Create purchase order
      const { data: orderData, error: orderError } = await supabase
        .from('share_purchase_orders')
        .insert({
          user_id: selectedUser,
          share_id: shareData.id,
          quantity,
          price_per_share: shareData.price_per_share,
          total_amount: totalAmount,
          currency: shareData.currency,
          payment_source: paymentMethod,
          status: 'completed'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Update share pool
      const { error: updateError } = await supabase
        .from('shares')
        .update({
          available_shares: shareData.available_shares - quantity
        })
        .eq('id', shareData.id);

      if (updateError) throw updateError;

      // Allocate purchase proceeds to admin sub-wallets according to allocation rules
      const { error: allocationError } = await supabase.rpc('allocate_share_purchase_proceeds_enhanced', {
        p_amount: totalAmount,
        p_currency: shareData.currency,
        p_transaction_id: orderData.id,
        p_user_id: selectedUser
      });

      if (allocationError) {
        console.error('Error allocating purchase proceeds:', allocationError);
        // Don't throw error as purchase is already complete, just log it
      }

      toast.success(`Successfully processed purchase of ${quantity} shares for ${userProfile.full_name}`);
      onUpdate();
      setQuantity(1);
      setSelectedUser('');
    } catch (error) {
      console.error('Error processing purchase:', error);
      toast.error('Failed to process purchase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Enhanced Share Purchase Flow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select User</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                    <Badge variant="outline" className="ml-2">
                      {user.account_type}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min={1}
                max={shareData.available_shares}
              />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wallet">Wallet Balance</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {userProfile && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Purchase Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span>User:</span>
                <span>{userProfile.full_name}</span>
                <span>Account Type:</span>
                <span className="capitalize">{userProfile.account_type}</span>
                <span>Quantity:</span>
                <span>{quantity} shares</span>
                <span>Price per Share:</span>
                <span>{shareData.currency} {shareData.price_per_share.toLocaleString()}</span>
                <span>Total Amount:</span>
                <span className="font-medium">
                  {shareData.currency} {(quantity * shareData.price_per_share).toLocaleString()}
                </span>
                <span>Wallet Balance:</span>
                <span>{shareData.currency} {walletBalance.toLocaleString()}</span>
              </div>
            </div>
          )}

          {userProfile && (
            <ShareBuyingValidator
              userProfile={userProfile}
              quantity={quantity}
              sharePrice={shareData.price_per_share}
              availableShares={shareData.available_shares}
              buyingLimits={buyingLimits}
              walletBalance={walletBalance}
            />
          )}

          <Button
            onClick={handlePurchase}
            disabled={loading || !selectedUser || quantity <= 0}
            className="w-full"
          >
            {loading ? 'Processing...' : `Process Purchase`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedSharePurchaseFlow;
