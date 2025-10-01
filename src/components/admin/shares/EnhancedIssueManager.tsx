import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, DollarSign, Users, AlertTriangle, Package, TrendingUp, Shield } from 'lucide-react';

interface ShareData {
  id: string;
  name: string;
  total_shares: number;
  available_shares: number;
  price_per_share: number;
  currency: string;
  reserve_allocated_shares?: number;
  reserve_issued_shares?: number;
}

interface EnhancedIssueManagerProps {
  shareData: ShareData;
  onUpdate: () => void;
}

const EnhancedIssueManager: React.FC<EnhancedIssueManagerProps> = ({ 
  shareData, 
  onUpdate 
}) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [accountLimits, setAccountLimits] = useState<any>(null);
  
  const [marketIssueForm, setMarketIssueForm] = useState({
    user_id: '',
    quantity: 1,
    notes: ''
  });

  const [reserveIssueForm, setReserveIssueForm] = useState({
    user_id: '',
    quantity: 1,
    admin_price: 0,
    reason: '',
    notes: ''
  });

  const availableShares = shareData.available_shares;
  const reserveShares = (shareData.reserve_allocated_shares || 0) - (shareData.reserve_issued_shares || 0);

  useEffect(() => {
    loadUsers();
    loadAccountLimits();
  }, []);

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

  const loadAccountLimits = async () => {
    try {
      const { data, error } = await supabase
        .from('share_buying_limits')
        .select('*');

      if (error && error.code !== 'PGRST116') throw error;
      
      // Convert array to object keyed by account_type for easy lookup
      const limitsMap = {};
      if (data) {
        data.forEach(limit => {
          limitsMap[limit.account_type] = limit;
        });
      }
      setAccountLimits(limitsMap);
    } catch (error) {
      console.error('Error loading account limits:', error);
    }
  };

  const checkUserLimits = async (userId: string, quantity: number, totalAmount: number): Promise<boolean> => {
    try {
      // Get user's account type
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('account_type')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      const accountType = userData?.account_type || 'individual';
      const userAccountLimits = accountLimits?.[accountType];

      if (!userAccountLimits) {
        console.log(`No limits found for account type: ${accountType}`);
        return true; // Allow if no specific limits found
      }

      // Get user's current holdings
      const { data: userShares, error: userSharesError } = await supabase
        .from('user_shares')
        .select('quantity')
        .eq('user_id', userId)
        .eq('share_id', shareData.id);

      if (userSharesError) throw userSharesError;

      const currentHoldings = userShares?.reduce((total, share) => total + share.quantity, 0) || 0;
      const newTotalHoldings = currentHoldings + quantity;

      // Check maximum quantity limit for account type
      if (userAccountLimits.max_buy_amount && newTotalHoldings > userAccountLimits.max_buy_amount) {
        toast.error(`Issue would exceed maximum ${accountType} account limit of ${userAccountLimits.max_buy_amount.toLocaleString()} shares`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking user limits:', error);
      return false;
    }
  };

  const handleMarketIssue = async () => {
    if (!marketIssueForm.user_id || marketIssueForm.quantity <= 0) {
      toast.error('Please select a user and enter valid quantity');
      return;
    }

    if (marketIssueForm.quantity > availableShares) {
      toast.error(`Cannot issue more than ${availableShares.toLocaleString()} available shares`);
      return;
    }

    const totalAmount = marketIssueForm.quantity * shareData.price_per_share;
    
    const limitsOk = await checkUserLimits(marketIssueForm.user_id, marketIssueForm.quantity, totalAmount);
    if (!limitsOk) return;

    setLoading(true);
    try {
      // Check user wallet balance
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', marketIssueForm.user_id)
        .eq('currency', shareData.currency)
        .single();

      if (walletError) throw walletError;

      if ((walletData?.balance || 0) < totalAmount) {
        toast.error('User has insufficient wallet balance');
        setLoading(false);
        return;
      }

      // Get admin ID
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Process the market issue with metadata for movement tracking
      const { error: orderError } = await supabase
        .from('share_purchase_orders')
        .insert({
          user_id: marketIssueForm.user_id,
          share_id: shareData.id,
          quantity: marketIssueForm.quantity,
          price_per_share: shareData.price_per_share,
          total_amount: totalAmount,
          currency: shareData.currency,
          payment_source: 'wallet',
          status: 'completed',
          metadata: {
            issue_type: 'company_issue',
            admin_id: currentUser?.id,
            notes: marketIssueForm.notes
          }
        });

      if (orderError) throw orderError;

      // Update share availability
      const { error: updateError } = await supabase
        .from('shares')
        .update({
          available_shares: availableShares - marketIssueForm.quantity
        })
        .eq('id', shareData.id);

      if (updateError) throw updateError;

      // Deduct from wallet
      const { error: walletUpdateError } = await supabase
        .from('wallets')
        .update({ 
          balance: (walletData?.balance || 0) - totalAmount 
        })
        .eq('user_id', marketIssueForm.user_id)
        .eq('currency', shareData.currency);

      if (walletUpdateError) throw walletUpdateError;

      const selectedUser = users.find(u => u.id === marketIssueForm.user_id);
      toast.success(
        `Successfully issued ${marketIssueForm.quantity.toLocaleString()} shares to ${selectedUser?.full_name} at market price`
      );

      // Reset form
      setMarketIssueForm({ user_id: '', quantity: 1, notes: '' });
      onUpdate();
    } catch (error) {
      console.error('Error processing market issue:', error);
      toast.error('Failed to process market issue');
    } finally {
      setLoading(false);
    }
  };

  const handleReserveIssue = async () => {
    if (!reserveIssueForm.user_id || reserveIssueForm.quantity <= 0 || reserveIssueForm.admin_price < 0) {
      toast.error('Please fill in all required fields with valid values');
      return;
    }

    if (reserveIssueForm.quantity > reserveShares) {
      toast.error(`Cannot issue more than ${reserveShares.toLocaleString()} reserve shares`);
      return;
    }

    const totalAmount = reserveIssueForm.quantity * reserveIssueForm.admin_price;
    
    if (totalAmount > 0) {
      const limitsOk = await checkUserLimits(reserveIssueForm.user_id, reserveIssueForm.quantity, totalAmount);
      if (!limitsOk) return;
    }

    setLoading(true);
    try {
      // Check wallet balance if price > 0
      if (totalAmount > 0) {
        const { data: walletData, error: walletError } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', reserveIssueForm.user_id)
          .eq('currency', shareData.currency)
          .single();

        if (walletError) throw walletError;

        if ((walletData?.balance || 0) < totalAmount) {
          toast.error('User has insufficient wallet balance');
          setLoading(false);
          return;
        }

        // Deduct from wallet if price > 0
        const { error: walletUpdateError } = await supabase
          .from('wallets')
          .update({ 
            balance: (walletData?.balance || 0) - totalAmount 
          })
          .eq('user_id', reserveIssueForm.user_id)
          .eq('currency', shareData.currency);

        if (walletUpdateError) throw walletUpdateError;
      }

      // Get admin ID
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Process the reserve issue with metadata for movement tracking
      const { error: orderError } = await supabase
        .from('share_purchase_orders')
        .insert({
          user_id: reserveIssueForm.user_id,
          share_id: shareData.id,
          quantity: reserveIssueForm.quantity,
          price_per_share: reserveIssueForm.admin_price,
          total_amount: totalAmount,
          currency: shareData.currency,
          payment_source: 'wallet',
          status: 'completed',
          metadata: {
            issue_type: 'reserve_issue',
            admin_id: currentUser?.id,
            reason: reserveIssueForm.reason,
            notes: reserveIssueForm.notes
          }
        });

      if (orderError) throw orderError;

      // Update reserve tracking
      const { error: updateError } = await supabase
        .from('shares')
        .update({
          reserve_issued_shares: (shareData.reserve_issued_shares || 0) + reserveIssueForm.quantity
        })
        .eq('id', shareData.id);

      if (updateError) throw updateError;

      const selectedUser = users.find(u => u.id === reserveIssueForm.user_id);
      toast.success(
        `Successfully issued ${reserveIssueForm.quantity.toLocaleString()} reserve shares to ${selectedUser?.full_name} ` +
        `at ${shareData.currency} ${reserveIssueForm.admin_price.toLocaleString()} per share`
      );

      // Reset form
      setReserveIssueForm({ user_id: '', quantity: 1, admin_price: shareData.price_per_share, reason: '', notes: '' });
      onUpdate();
    } catch (error) {
      console.error('Error processing reserve issue:', error);
      toast.error('Failed to process reserve issue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-2 gap-4">
        <Alert>
          <TrendingUp className="h-4 w-4" />
          <AlertDescription>
            <strong>Available Market Shares:</strong> {availableShares.toLocaleString()} 
            <span className="text-muted-foreground ml-2">
              at {shareData.currency} {shareData.price_per_share.toLocaleString()}/share
            </span>
          </AlertDescription>
        </Alert>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Available Reserve Shares:</strong> {reserveShares.toLocaleString()}
            <span className="text-muted-foreground ml-2">
              at admin-set pricing
            </span>
          </AlertDescription>
        </Alert>
      </div>

      <Tabs defaultValue="market" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="market" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Market Price Issue
          </TabsTrigger>
          <TabsTrigger value="reserve" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Reserve Issue
          </TabsTrigger>
        </TabsList>

        <TabsContent value="market">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Issue Shares at Market Price
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Issue available shares from the pool at current market price ({shareData.currency} {shareData.price_per_share.toLocaleString()})
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Recipient</Label>
                <Select 
                  value={marketIssueForm.user_id} 
                  onValueChange={(value) => setMarketIssueForm(prev => ({ ...prev, user_id: value }))}
                >
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

              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  max={availableShares}
                  value={marketIssueForm.quantity}
                  onChange={(e) => setMarketIssueForm(prev => ({ 
                    ...prev, 
                    quantity: Number(e.target.value) 
                  }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Max: {availableShares.toLocaleString()} shares available
                </p>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  placeholder="Optional notes about this issuance..."
                  value={marketIssueForm.notes}
                  onChange={(e) => setMarketIssueForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              {marketIssueForm.user_id && marketIssueForm.quantity > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Market Issue Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span>Quantity:</span>
                    <span>{marketIssueForm.quantity.toLocaleString()} shares</span>
                    
                    <span>Price per Share:</span>
                    <span>{shareData.currency} {shareData.price_per_share.toLocaleString()}</span>
                    
                    <span>Total Amount:</span>
                    <span className="font-medium">
                      {shareData.currency} {(marketIssueForm.quantity * shareData.price_per_share).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleMarketIssue}
                disabled={loading || !marketIssueForm.user_id || marketIssueForm.quantity <= 0 || availableShares <= 0}
                className="w-full"
              >
                {loading ? 'Processing...' : `Issue ${marketIssueForm.quantity} Market Shares`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reserve">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Issue Reserve Shares
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Issue reserved shares at admin-defined pricing (can be different from market price)
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Issues reserve shares at admin-defined price. Set price to 0 for free issuance.
                </AlertDescription>
              </Alert>

              <div>
                <Label>Select Recipient</Label>
                <Select 
                  value={reserveIssueForm.user_id} 
                  onValueChange={(value) => setReserveIssueForm(prev => ({ ...prev, user_id: value }))}
                >
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
                    min="1"
                    max={reserveShares}
                    value={reserveIssueForm.quantity}
                    onChange={(e) => setReserveIssueForm(prev => ({ 
                      ...prev, 
                      quantity: Number(e.target.value) 
                    }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Max: {reserveShares.toLocaleString()} reserve shares
                  </p>
                </div>

                <div>
                  <Label>Admin Price per Share ({shareData.currency})</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={reserveIssueForm.admin_price}
                    onChange={(e) => setReserveIssueForm(prev => ({ 
                      ...prev, 
                      admin_price: Number(e.target.value) 
                    }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Set to 0 for free issuance
                  </p>
                </div>
              </div>

              <div>
                <Label>Issue Reason</Label>
                <Select 
                  value={reserveIssueForm.reason} 
                  onValueChange={(value) => setReserveIssueForm(prev => ({ ...prev, reason: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason for issuance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="promotional">Promotional Grant</SelectItem>
                    <SelectItem value="employee_compensation">Employee Compensation</SelectItem>
                    <SelectItem value="strategic_partnership">Strategic Partnership</SelectItem>
                    <SelectItem value="early_investor_bonus">Early Investor Bonus</SelectItem>
                    <SelectItem value="loyalty_reward">Loyalty Reward</SelectItem>
                    <SelectItem value="special_offer">Special Offer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Additional Notes</Label>
                <Textarea
                  placeholder="Optional notes about this issuance..."
                  value={reserveIssueForm.notes}
                  onChange={(e) => setReserveIssueForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              {reserveIssueForm.user_id && reserveIssueForm.quantity > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Issue Summary:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span>Quantity:</span>
                    <span>{reserveIssueForm.quantity.toLocaleString()} shares</span>
                    <span>Price per Share:</span>
                    <span>{shareData.currency} {reserveIssueForm.admin_price.toLocaleString()}</span>
                    <span>Total Value:</span>
                    <span className="font-medium">
                      {shareData.currency} {(reserveIssueForm.quantity * reserveIssueForm.admin_price).toLocaleString()}
                    </span>
                    <span>Payment Method:</span>
                    <span>{reserveIssueForm.admin_price === 0 ? 'Free Issuance' : 'Auto-deduct from Wallet'}</span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleReserveIssue}
                disabled={loading || !reserveIssueForm.user_id || reserveIssueForm.quantity <= 0 || !reserveIssueForm.reason}
                className="w-full"
              >
                {loading ? 'Processing...' : `Issue ${reserveIssueForm.quantity} Reserve Shares`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedIssueManager;