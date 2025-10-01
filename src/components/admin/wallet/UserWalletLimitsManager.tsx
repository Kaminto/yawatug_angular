
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, UserCheck, UserX, Settings, Shield } from 'lucide-react';

interface UserLimit {
  id: string;
  user_id: string;
  currency: string;
  daily_deposit_limit: number | null;
  daily_withdraw_limit: number | null;
  monthly_deposit_limit: number | null;
  monthly_withdraw_limit: number | null;
  is_suspended: boolean;
  suspension_reason: string | null;
  user_name?: string;
  user_email?: string;
  wallet_balance?: number;
  has_existing_limits?: boolean;
}

const UserWalletLimitsManager = () => {
  const [userLimits, setUserLimits] = useState<UserLimit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingLimit, setEditingLimit] = useState<UserLimit | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [dailyDepositLimit, setDailyDepositLimit] = useState('');
  const [dailyWithdrawLimit, setDailyWithdrawLimit] = useState('');
  const [monthlyDepositLimit, setMonthlyDepositLimit] = useState('');
  const [monthlyWithdrawLimit, setMonthlyWithdrawLimit] = useState('');
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUserLimits();
  }, []);

  const loadUserLimits = async () => {
    try {
      // Get all wallets
      const { data: wallets, error: walletsError } = await supabase
        .from('wallets')
        .select('id, user_id, currency, balance, status')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (walletsError) throw walletsError;

      // Get user profiles separately
      const userIds = [...new Set(wallets?.map(w => w.user_id) || [])];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Try to get existing limits for these wallets
      const { data: existingLimits } = await supabase
        .from('user_wallet_limits')
        .select('*');

      // Create wallet limits data combining wallets and existing limits
      const walletLimitsData = (wallets || []).map(wallet => {
        const profile = profiles?.find(p => p.id === wallet.user_id);
        const existingLimit = existingLimits?.find(
          limit => limit.user_id === wallet.user_id && limit.currency === wallet.currency
        );

        return {
          id: existingLimit?.id || `${wallet.user_id}-${wallet.currency}`,
          user_id: wallet.user_id,
          currency: wallet.currency,
          daily_deposit_limit: existingLimit?.daily_deposit_limit || null,
          daily_withdraw_limit: existingLimit?.daily_withdraw_limit || null,
          monthly_deposit_limit: existingLimit?.monthly_deposit_limit || null,
          monthly_withdraw_limit: existingLimit?.monthly_withdraw_limit || null,
          is_suspended: existingLimit?.is_suspended || false,
          suspension_reason: existingLimit?.suspension_reason || null,
          user_name: profile?.full_name || 'Unknown',
          user_email: profile?.email || 'Unknown',
          wallet_balance: wallet.balance,
          has_existing_limits: !!existingLimit
        };
      });

      setUserLimits(walletLimitsData);
    } catch (error) {
      console.error('Error loading user limits:', error);
      toast.error('Failed to load user wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditLimit = (limit: UserLimit) => {
    setEditingLimit(limit);
    setDailyDepositLimit(limit.daily_deposit_limit?.toString() || '');
    setDailyWithdrawLimit(limit.daily_withdraw_limit?.toString() || '');
    setMonthlyDepositLimit(limit.monthly_deposit_limit?.toString() || '');
    setMonthlyWithdrawLimit(limit.monthly_withdraw_limit?.toString() || '');
    setIsSuspended(limit.is_suspended);
    setSuspensionReason(limit.suspension_reason || '');
    setShowEditDialog(true);
  };

  const handleSaveLimit = async () => {
    if (!editingLimit) return;

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updateData = {
        user_id: editingLimit.user_id,
        currency: editingLimit.currency,
        daily_deposit_limit: dailyDepositLimit ? parseFloat(dailyDepositLimit) : null,
        daily_withdraw_limit: dailyWithdrawLimit ? parseFloat(dailyWithdrawLimit) : null,
        monthly_deposit_limit: monthlyDepositLimit ? parseFloat(monthlyDepositLimit) : null,
        monthly_withdraw_limit: monthlyWithdrawLimit ? parseFloat(monthlyWithdrawLimit) : null,
        is_suspended: isSuspended,
        suspension_reason: isSuspended ? suspensionReason : null,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      };

      if (editingLimit.has_existing_limits) {
        // Update existing record
        const { error } = await supabase
          .from('user_wallet_limits')
          .update(updateData)
          .eq('user_id', editingLimit.user_id)
          .eq('currency', editingLimit.currency);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('user_wallet_limits')
          .insert({
            ...updateData,
            created_by: user.id,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      toast.success('User wallet limits updated successfully');
      setShowEditDialog(false);
      loadUserLimits();
    } catch (error: any) {
      console.error('Error updating user limits:', error);
      toast.error(error.message || 'Failed to update user limits');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateLimit = async (userId: string, currency: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_wallet_limits')
        .insert({
          user_id: userId,
          currency: currency,
          created_by: user.id
        });

      if (error) throw error;

      toast.success('User wallet limit created successfully');
      loadUserLimits();
    } catch (error: any) {
      console.error('Error creating user limit:', error);
      toast.error(error.message || 'Failed to create user limit');
    }
  };

  const filteredLimits = userLimits.filter(limit => 
    limit.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    limit.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    limit.currency.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (limit: UserLimit) => {
    if (limit.is_suspended) {
      return <Badge variant="destructive"><UserX className="h-3 w-3 mr-1" />Suspended</Badge>;
    }
    
    const hasLimits = limit.daily_deposit_limit || limit.daily_withdraw_limit || 
                     limit.monthly_deposit_limit || limit.monthly_withdraw_limit;
    
    if (hasLimits) {
      return <Badge variant="outline"><Shield className="h-3 w-3 mr-1" />Limited</Badge>;
    }
    
    return <Badge variant="default"><UserCheck className="h-3 w-3 mr-1" />Unlimited</Badge>;
  };

  if (loading) {
    return <div className="animate-pulse">Loading user wallet limits...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Wallet Limits Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user name, email, or currency..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={loadUserLimits}>
              Refresh
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Daily Limits</TableHead>
                <TableHead>Monthly Limits</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLimits.map((limit) => (
                <TableRow key={limit.id}>
                  <TableCell className="font-medium">
                    {limit.user_name}
                  </TableCell>
                  <TableCell>{limit.user_email}</TableCell>
                  <TableCell>{limit.currency}</TableCell>
                  <TableCell className="font-mono">
                    {limit.wallet_balance?.toLocaleString()} {limit.currency}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>Deposit: {limit.daily_deposit_limit ? `${limit.daily_deposit_limit.toLocaleString()}` : 'Unlimited'}</div>
                      <div>Withdraw: {limit.daily_withdraw_limit ? `${limit.daily_withdraw_limit.toLocaleString()}` : 'Unlimited'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>Deposit: {limit.monthly_deposit_limit ? `${limit.monthly_deposit_limit.toLocaleString()}` : 'Unlimited'}</div>
                      <div>Withdraw: {limit.monthly_withdraw_limit ? `${limit.monthly_withdraw_limit.toLocaleString()}` : 'Unlimited'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(limit)}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditLimit(limit)}
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredLimits.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No user wallets found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Limit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Wallet Limits</DialogTitle>
          </DialogHeader>
          
          {editingLimit && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="font-medium text-foreground">{editingLimit.user_name}</p>
                <p className="text-sm text-muted-foreground">{editingLimit.user_email}</p>
                <p className="text-sm text-muted-foreground">Currency: {editingLimit.currency}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-foreground">Daily Deposit Limit</Label>
                  <Input
                    type="number"
                    placeholder="Unlimited"
                    value={dailyDepositLimit}
                    onChange={(e) => setDailyDepositLimit(e.target.value)}
                    className="bg-background text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-foreground">Daily Withdraw Limit</Label>
                  <Input
                    type="number"
                    placeholder="Unlimited"
                    value={dailyWithdrawLimit}
                    onChange={(e) => setDailyWithdrawLimit(e.target.value)}
                    className="bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-foreground">Monthly Deposit Limit</Label>
                  <Input
                    type="number"
                    placeholder="Unlimited"
                    value={monthlyDepositLimit}
                    onChange={(e) => setMonthlyDepositLimit(e.target.value)}
                    className="bg-background text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-foreground">Monthly Withdraw Limit</Label>
                  <Input
                    type="number"
                    placeholder="Unlimited"
                    value={monthlyWithdrawLimit}
                    onChange={(e) => setMonthlyWithdrawLimit(e.target.value)}
                    className="bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={isSuspended}
                    onCheckedChange={setIsSuspended}
                  />
                  <Label className="text-foreground">Suspend wallet access</Label>
                </div>
                
                {isSuspended && (
                  <div>
                    <Label className="text-foreground">Suspension Reason</Label>
                    <Textarea
                      placeholder="Enter reason for suspension..."
                      value={suspensionReason}
                      onChange={(e) => setSuspensionReason(e.target.value)}
                      className="bg-background text-foreground"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLimit} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserWalletLimitsManager;
