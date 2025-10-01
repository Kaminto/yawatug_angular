
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowRightLeft, Plus, Search, Send } from 'lucide-react';

interface UserTransfer {
  id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  currency: string;
  status: string;
  transfer_type: string;
  admin_notes?: string;
  reference?: string;
  created_at: string;
  created_by?: string;
  from_user_name?: string;
  to_user_name?: string;
  from_user_email?: string;
  to_user_email?: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
}

const UserTransferManager = () => {
  const [transfers, setTransfers] = useState<UserTransfer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [fromUserId, setFromUserId] = useState('');
  const [toUserId, setToUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('UGX');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');

  useEffect(() => {
    loadTransfers();
    loadUsers();
  }, []);

  const loadTransfers = async () => {
    try {
      // Get transactions that are transfers
      const { data: transfersData, error: transfersError } = await supabase
        .from('transactions')
        .select('*')
        .eq('transaction_type', 'transfer')
        .order('created_at', { ascending: false });

      if (transfersError) throw transfersError;

      // Get user details for each transfer
      const transfersWithUsers = await Promise.all(
        (transfersData || []).map(async (transfer) => {
          const [fromUserResult, toUserResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', transfer.user_id)
              .single(),
            supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', transfer.user_id)
              .single()
          ]);

          return {
            ...transfer,
            from_user_id: transfer.user_id,
            to_user_id: transfer.user_id,
            transfer_type: 'admin_transfer',
            from_user_name: fromUserResult.data?.full_name || 'Unknown',
            from_user_email: fromUserResult.data?.email || 'Unknown',
            to_user_name: toUserResult.data?.full_name || 'Unknown',
            to_user_email: toUserResult.data?.email || 'Unknown'
          };
        })
      );

      setTransfers(transfersWithUsers);
    } catch (error) {
      console.error('Error loading transfers:', error);
      toast.error('Failed to load user transfers');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .eq('user_role', 'user')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    }
  };

  const handleCreateTransfer = async () => {
    if (!fromUserId || !toUserId || !amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (fromUserId === toUserId) {
      toast.error('Cannot transfer to the same user');
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check sender's wallet balance
      const { data: senderWallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', fromUserId)
        .eq('currency', currency)
        .single();

      if (walletError) throw new Error('Sender wallet not found');

      if (senderWallet.balance < parseFloat(amount)) {
        throw new Error('Insufficient balance in sender wallet');
      }

      // Get sender's wallet ID
      const { data: senderWalletData, error: senderWalletError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', fromUserId)
        .eq('currency', currency)
        .single();

      if (senderWalletError) throw new Error('Sender wallet not found');

      // Get receiver's wallet ID
      const { data: receiverWalletData, error: receiverWalletError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', toUserId)
        .eq('currency', currency)
        .single();

      if (receiverWalletError) throw new Error('Receiver wallet not found');

      // Create transfer transaction for sender (debit)
      const { data: senderTransaction, error: senderError } = await supabase
        .from('transactions')
        .insert({
          user_id: fromUserId,
          wallet_id: senderWalletData.id,
          transaction_type: 'transfer',
          amount: -parseFloat(amount),
          currency: currency,
          status: 'completed',
          approval_status: 'approved',
          admin_notes: description || `Transfer to ${users.find(u => u.id === toUserId)?.full_name}`,
          reference: reference || `TXF-${Date.now()}`,
        })
        .select()
        .single();

      if (senderError) throw senderError;

      // Create transfer transaction for receiver (credit)
      const { error: receiverError } = await supabase
        .from('transactions')
        .insert({
          user_id: toUserId,
          wallet_id: receiverWalletData.id,
          transaction_type: 'transfer',
          amount: parseFloat(amount),
          currency: currency,
          status: 'completed',
          approval_status: 'approved',
          admin_notes: description || `Transfer from ${users.find(u => u.id === fromUserId)?.full_name}`,
          reference: reference || `TXF-${Date.now()}`,
        });

      if (receiverError) throw receiverError;

      // Update wallet balances
      await Promise.all([
        supabase
          .from('wallets')
          .update({ 
            balance: senderWallet.balance - parseFloat(amount),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', fromUserId)
          .eq('currency', currency),
        
        supabase.rpc('update_recipient_wallet_balance', {
          p_user_id: toUserId,
          p_currency: currency,
          p_amount: parseFloat(amount)
        })
      ]);

      toast.success('Transfer completed successfully');
      setShowCreateDialog(false);
      resetForm();
      loadTransfers();
    } catch (error: any) {
      console.error('Error creating transfer:', error);
      toast.error(error.message || 'Failed to create transfer');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFromUserId('');
    setToUserId('');
    setAmount('');
    setCurrency('UGX');
    setDescription('');
    setReference('');
  };

  const filteredTransfers = transfers.filter(transfer => {
    const matchesSearch = 
      transfer.from_user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.to_user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || transfer.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { color: 'bg-green-500', text: 'Completed' },
      pending: { color: 'bg-yellow-500', text: 'Pending' },
      failed: { color: 'bg-red-500', text: 'Failed' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  if (loading) {
    return <div className="animate-pulse">Loading user transfers...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              User Transfers ({filteredTransfers.length})
            </CardTitle>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Transfer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user names or reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={loadTransfers}>
              Refresh
            </Button>
          </div>

          {/* Transfers Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From User</TableHead>
                <TableHead>To User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell>
                    <div>
                       <div className="font-medium">{transfer.from_user_name}</div>
                       <div className="text-sm text-muted-foreground">{transfer.from_user_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                       <div className="font-medium">{transfer.to_user_name}</div>
                       <div className="text-sm text-muted-foreground">{transfer.to_user_email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">
                    {transfer.currency} {Math.abs(transfer.amount).toLocaleString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                  <TableCell>
                    {new Date(transfer.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {transfer.reference || 'N/A'}
                  </TableCell>
                   <TableCell className="max-w-xs truncate">
                     {transfer.admin_notes || 'N/A'}
                   </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredTransfers.length === 0 && (
            <div className="text-center py-8">
              <ArrowRightLeft className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No user transfers found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Transfer Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Create User Transfer
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>From User</Label>
              <Select value={fromUserId} onValueChange={setFromUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sender" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>To User</Label>
              <Select value={toUserId} onValueChange={setToUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UGX">UGX</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Reference (Optional)</Label>
              <Input
                placeholder="Transfer reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            <div>
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Transfer description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTransfer} disabled={creating}>
              {creating ? 'Creating...' : 'Create Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserTransferManager;
