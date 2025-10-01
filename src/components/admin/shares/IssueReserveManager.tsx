import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, DollarSign, Users, AlertTriangle } from 'lucide-react';
import { ShareData } from '@/types/custom';

interface IssueReserveManagerProps {
  shareData: ShareData;
  onUpdate: () => void;
}

const IssueReserveManager: React.FC<IssueReserveManagerProps> = ({ 
  shareData, 
  onUpdate 
}) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    user_id: '',
    quantity: 1,
    issue_price: 0,
    reason: '',
    notes: ''
  });

  const availableReserveShares = shareData.reserve_allocated_shares - shareData.reserve_issued_shares;
  const totalIssueValue = formData.quantity * formData.issue_price;

  useEffect(() => {
    loadUsers();
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

  const checkUserWalletBalance = async (userId: string, amount: number): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .eq('currency', shareData.currency)
        .single();

      if (error) throw error;
      return (data?.balance || 0) >= amount;
    } catch (error) {
      console.error('Error checking wallet balance:', error);
      return false;
    }
  };

  const handleIssueReserve = async () => {
    if (!formData.user_id) {
      toast.error('Please select a user');
      return;
    }

    if (formData.quantity <= 0 || formData.quantity > availableReserveShares) {
      toast.error(`Quantity must be between 1 and ${availableReserveShares}`);
      return;
    }

    if (formData.issue_price < 0) {
      toast.error('Issue price cannot be negative');
      return;
    }

    setLoading(true);
    try {
      // Check wallet balance if price > 0
      if (formData.issue_price > 0) {
        const hasBalance = await checkUserWalletBalance(formData.user_id, totalIssueValue);
        if (!hasBalance) {
          toast.error('User has insufficient wallet balance');
          setLoading(false);
          return;
        }
      }

      // Process the reserve share issuance manually
      console.log('Processing reserve share issuance...');
        
      // Create share purchase record
      const { error: purchaseError } = await supabase
        .from('share_purchase_orders')
        .insert({
          user_id: formData.user_id,
          share_id: shareData.id,
          quantity: formData.quantity,
          price_per_share: formData.issue_price,
          total_amount: totalIssueValue,
          currency: shareData.currency,
          payment_source: 'wallet',
          status: 'completed',
          order_type: 'reserve_issue',
          notes: `Reserve Issue: ${formData.reason}`
        });

      if (purchaseError) throw purchaseError;

      // Update share reserve tracking
      const { error: updateError } = await supabase
        .from('shares')
        .update({
          reserve_issued_shares: (shareData.reserve_issued_shares || 0) + formData.quantity
        })
        .eq('id', shareData.id);

      if (updateError) throw updateError;

      // Deduct from wallet if price > 0
      if (formData.issue_price > 0) {
        // First get current balance
        const { data: walletData, error: walletGetError } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', formData.user_id)
          .eq('currency', shareData.currency)
          .single();

        if (walletGetError) throw walletGetError;
        
        const newBalance = (walletData?.balance || 0) - totalIssueValue;
        
        // Update with calculated balance
        const { error: walletError } = await supabase
          .from('wallets')
          .update({ balance: newBalance })
          .eq('user_id', formData.user_id)
          .eq('currency', shareData.currency);

        if (walletError) throw walletError;

        // Create transaction record
        const { error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: formData.user_id,
            wallet_id: await getUserWalletId(formData.user_id),
            amount: -totalIssueValue,
            currency: shareData.currency,
            transaction_type: 'share_purchase',
            description: `Reserve share purchase: ${formData.quantity} shares at ${formData.issue_price} each`,
            status: 'completed'
          });

        if (txError) throw txError;
      }

      const selectedUser = users.find(u => u.id === formData.user_id);
      toast.success(
        `Successfully issued ${formData.quantity} reserve shares to ${selectedUser?.full_name} ` +
        `at ${shareData.currency} ${formData.issue_price} per share`
      );

      // Reset form
      setFormData({
        user_id: '',
        quantity: 1,
        issue_price: 0,
        reason: '',
        notes: ''
      });

      onUpdate();
    } catch (error) {
      console.error('Error issuing reserve shares:', error);
      toast.error('Failed to issue reserve shares');
    } finally {
      setLoading(false);
    }
  };

  const getUserWalletId = async (userId: string): Promise<string> => {
    const { data } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .eq('currency', shareData.currency)
      .single();
    
    return data?.id || '';
  };

  const selectedUser = users.find(u => u.id === formData.user_id);

  return (
    <div className="space-y-6">
      {/* Available Reserve Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Available Reserve Shares: <strong>{availableReserveShares.toLocaleString()}</strong> out of{' '}
          <strong>{shareData.reserve_allocated_shares.toLocaleString()}</strong> allocated
        </AlertDescription>
      </Alert>

      {/* Issue Reserve Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Issue Reserve Shares
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Recipient</Label>
            <Select value={formData.user_id} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, user_id: value }))
            }>
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
                max={availableReserveShares}
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  quantity: Number(e.target.value) 
                }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Max: {availableReserveShares.toLocaleString()} shares
              </p>
            </div>

            <div>
              <Label>Issue Price per Share ({shareData.currency})</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.issue_price}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  issue_price: Number(e.target.value) 
                }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Set to 0 for free issuance. Market price: {shareData.price_per_share.toLocaleString()}
              </p>
            </div>
          </div>

          <div>
            <Label>Issue Reason</Label>
            <Select value={formData.reason} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, reason: value }))
            }>
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
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          {/* Issue Summary */}
          {selectedUser && formData.quantity > 0 && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Issue Summary
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span>Recipient:</span>
                <span>{selectedUser.full_name}</span>
                
                <span>Account Type:</span>
                <span className="capitalize">{selectedUser.account_type}</span>
                
                <span>Quantity:</span>
                <span>{formData.quantity.toLocaleString()} shares</span>
                
                <span>Price per Share:</span>
                <span>{shareData.currency} {formData.issue_price.toLocaleString()}</span>
                
                <span>Total Value:</span>
                <span className="font-medium">
                  {shareData.currency} {totalIssueValue.toLocaleString()}
                </span>
                
                <span>Payment Method:</span>
                <span>{formData.issue_price === 0 ? 'Free Issuance' : 'Auto-deduct from Wallet'}</span>
              </div>
              
              {formData.issue_price > 0 && (
                <div className="mt-2 p-2 bg-background rounded border">
                  <p className="text-xs text-muted-foreground">
                    💡 Amount will be automatically deducted from user's {shareData.currency} wallet. 
                    If insufficient balance, user will be advised to make a deposit.
                  </p>
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleIssueReserve}
            disabled={loading || !formData.user_id || formData.quantity <= 0 || !formData.reason}
            className="w-full"
          >
            {loading ? 'Processing...' : `Issue ${formData.quantity} Reserve Shares`}
          </Button>
        </CardContent>
      </Card>

      {/* Market Impact Notice */}
      {formData.quantity > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Market Impact:</strong> Issuing {formData.quantity.toLocaleString()} shares will be 
            recorded as sales activity and may affect the automatic pricing calculations.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default IssueReserveManager;