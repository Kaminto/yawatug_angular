
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeftRight, Plus, Wallet, AlertCircle, History } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface AdminSubWallet {
  id: string;
  wallet_name: string;
  wallet_type: string;
  balance: number;
  currency: string;
  description: string;
  is_active: boolean;
}

interface AdminSubWalletManagementProps {
  onUpdate: () => void;
}

const AdminSubWalletManagement: React.FC<AdminSubWalletManagementProps> = ({ onUpdate }) => {
  const [subWallets, setSubWallets] = useState<AdminSubWallet[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Transfer form state
  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  const [transferReference, setTransferReference] = useState('');

  useEffect(() => {
    loadSubWallets();
    loadTransfers();
  }, []);

  const loadSubWallets = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_sub_wallets')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setSubWallets(data || []);
    } catch (error) {
      console.error('Error loading sub-wallets:', error);
      toast.error('Failed to load admin sub-wallets');
    } finally {
      setLoading(false);
    }
  };

  const loadTransfers = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_wallet_fund_transfers')
        .select(`
          *,
          from_wallet:admin_sub_wallets!from_wallet_id(wallet_name),
          to_wallet:admin_sub_wallets!to_wallet_id(wallet_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTransfers(data || []);
    } catch (error) {
      console.error('Error loading transfers:', error);
    }
  };

  const handleTransfer = async () => {
    if (!fromWalletId || !toWalletId || !transferAmount) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (fromWalletId === toWalletId) {
      toast.error('Cannot transfer to the same wallet');
      return;
    }

    const amount = parseFloat(transferAmount);
    if (amount <= 0) {
      toast.error('Transfer amount must be greater than 0');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check source wallet balance
      const fromWallet = subWallets.find(w => w.id === fromWalletId);
      if (!fromWallet || fromWallet.balance < amount) {
        throw new Error('Insufficient balance in source wallet');
      }

      // Try to use the RPC function first
      try {
        const { error: transferError } = await supabase.rpc('transfer_admin_funds', {
          p_from_wallet_id: fromWalletId,
          p_to_wallet_id: toWalletId,
          p_amount: amount,
          p_description: transferDescription || 'Manual admin fund transfer',
          p_reference: transferReference || null,
          p_created_by: user.id
        });

        if (transferError) throw transferError;
      } catch (rpcError) {
        console.log('RPC not available, doing manual transfer:', rpcError);
        
        // Manual transfer as fallback
        const { error: updateFromError } = await supabase
          .from('admin_sub_wallets')
          .update({ balance: fromWallet.balance - amount })
          .eq('id', fromWalletId);

        if (updateFromError) throw updateFromError;

        const toWallet = subWallets.find(w => w.id === toWalletId);
        if (!toWallet) throw new Error('Destination wallet not found');

        const { error: updateToError } = await supabase
          .from('admin_sub_wallets')
          .update({ balance: toWallet.balance + amount })
          .eq('id', toWalletId);

        if (updateToError) throw updateToError;

        // Record the transfer
        const { error: recordError } = await supabase
          .from('admin_wallet_fund_transfers')
          .insert({
            from_wallet_id: fromWalletId,
            to_wallet_id: toWalletId,
            amount,
            transfer_type: 'manual',
            description: transferDescription || 'Manual admin fund transfer',
            reference: transferReference || null,
            created_by: user.id
          });

        if (recordError) throw recordError;
      }

      toast.success('Fund transfer completed successfully');
      setShowTransferDialog(false);
      setFromWalletId('');
      setToWalletId('');
      setTransferAmount('');
      setTransferDescription('');
      setTransferReference('');
      
      await loadSubWallets();
      await loadTransfers();
      onUpdate();
    } catch (error: any) {
      console.error('Error transferring funds:', error);
      toast.error(error.message || 'Failed to transfer funds');
    } finally {
      setSaving(false);
    }
  };

  const getWalletIcon = (type: string) => {
    switch (type) {
      case 'project_funding':
        return <Wallet className="h-5 w-5 text-blue-600" />;
      case 'admin_fund':
        return <Wallet className="h-5 w-5 text-green-600" />;
      case 'share_buyback_fund':
        return <Wallet className="h-5 w-5 text-purple-600" />;
      default:
        return <Wallet className="h-5 w-5" />;
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading admin sub-wallets...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Admin Sub-Wallet Management</h3>
        <Button onClick={() => setShowTransferDialog(true)}>
          <ArrowLeftRight className="h-4 w-4 mr-2" />
          Transfer Funds
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {subWallets.map((wallet) => (
          <Card key={wallet.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                {getWalletIcon(wallet.wallet_type)}
                {wallet.wallet_name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {wallet.currency} {wallet.balance.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {wallet.description}
                </p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${wallet.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {wallet.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Transfers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Recent Fund Transfers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell>
                    {new Date(transfer.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {transfer.from_wallet?.wallet_name || 'External'}
                  </TableCell>
                  <TableCell>
                    {transfer.to_wallet?.wallet_name || 'External'}
                  </TableCell>
                  <TableCell>
                    {transfer.currency} {transfer.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <span className="capitalize">{transfer.transfer_type.replace('_', ' ')}</span>
                  </TableCell>
                  <TableCell>{transfer.description}</TableCell>
                  <TableCell>{transfer.reference || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Funds Between Sub-Wallets</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>From Wallet</Label>
              <Select value={fromWalletId} onValueChange={setFromWalletId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source wallet" />
                </SelectTrigger>
                <SelectContent>
                  {subWallets.map((wallet) => (
                    <SelectItem key={wallet.id} value={wallet.id}>
                      {wallet.wallet_name} ({wallet.currency} {wallet.balance.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>To Wallet</Label>
              <Select value={toWalletId} onValueChange={setToWalletId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination wallet" />
                </SelectTrigger>
                <SelectContent>
                  {subWallets.filter(w => w.id !== fromWalletId).map((wallet) => (
                    <SelectItem key={wallet.id} value={wallet.id}>
                      {wallet.wallet_name} ({wallet.currency} {wallet.balance.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                placeholder="Enter transfer amount"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
              />
              {fromWalletId && (
                <p className="text-xs text-muted-foreground mt-1">
                  Available: {subWallets.find(w => w.id === fromWalletId)?.currency} {subWallets.find(w => w.id === fromWalletId)?.balance.toLocaleString()}
                </p>
              )}
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Enter transfer description"
                value={transferDescription}
                onChange={(e) => setTransferDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div>
              <Label>Reference (Optional)</Label>
              <Input
                placeholder="Enter reference number"
                value={transferReference}
                onChange={(e) => setTransferReference(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTransfer} disabled={saving}>
              {saving ? 'Processing...' : 'Transfer Funds'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubWalletManagement;
