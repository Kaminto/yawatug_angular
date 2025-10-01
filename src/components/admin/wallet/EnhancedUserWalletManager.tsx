
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ExtendedWallet } from '@/types/custom';
import { 
  Search, 
  Plus, 
  Minus, 
  Eye, 
  Filter, 
  Download,
  RefreshCw,
  ArrowUpDown
} from 'lucide-react';

const EnhancedUserWalletManager = () => {
  const [wallets, setWallets] = useState<ExtendedWallet[]>([]);
  const [filteredWallets, setFilteredWallets] = useState<ExtendedWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Adjustment dialog state
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<ExtendedWallet | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'deduct'>('add');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentReference, setAdjustmentReference] = useState('');

  useEffect(() => {
    loadUserWallets();
  }, []);

  useEffect(() => {
    filterAndSortWallets();
  }, [wallets, searchTerm, currencyFilter, statusFilter, sortBy, sortOrder]);

  const loadUserWallets = async () => {
    try {
      const { data: walletsData, error } = await supabase
        .from('wallets')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;

      // Get user profiles for each wallet
      const walletsWithUsers = await Promise.all(
        (walletsData || []).map(async (wallet) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, phone')
            .eq('id', wallet.user_id)
            .single();

          return {
            ...wallet,
            user_name: profile?.full_name || 'Unknown',
            user_email: profile?.email || 'Unknown',
            user_phone: profile?.phone || 'Unknown'
          };
        })
      );

      setWallets(walletsWithUsers);
    } catch (error) {
      console.error('Error loading user wallets:', error);
      toast.error('Failed to load user wallets');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortWallets = () => {
    let filtered = wallets.filter(wallet => {
      const matchesSearch = 
        wallet.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wallet.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wallet.currency.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCurrency = currencyFilter === 'all' || wallet.currency === currencyFilter;
      const matchesStatus = statusFilter === 'all' || wallet.status === statusFilter;

      return matchesSearch && matchesCurrency && matchesStatus;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof ExtendedWallet];
      let bValue: any = b[sortBy as keyof ExtendedWallet];

      // Handle different data types
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredWallets(filtered);
  };

  const handleAdjustBalance = async () => {
    if (!selectedWallet || !adjustmentAmount || !adjustmentReason) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const amount = parseFloat(adjustmentAmount);
      const finalAmount = adjustmentType === 'add' ? amount : -amount;

      // Update wallet balance
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ 
          balance: selectedWallet.balance + finalAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedWallet.id);

      if (updateError) throw updateError;

      // Record the adjustment as a transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: selectedWallet.user_id,
          wallet_id: selectedWallet.id,
          amount: finalAmount,
          currency: selectedWallet.currency,
          transaction_type: adjustmentType === 'add' ? 'admin_credit' : 'admin_debit',
          status: 'completed',
          reference: adjustmentReference || null,
          description: adjustmentReason,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (transactionError) throw transactionError;

      // Record admin action
      await supabase
        .from('admin_actions')
        .insert({
          admin_id: user.id,
          user_id: selectedWallet.user_id,
          action_type: 'wallet_adjustment',
          reason: `Balance ${adjustmentType}: ${adjustmentAmount} ${selectedWallet.currency} - ${adjustmentReason}`
        });

      toast.success('Wallet balance adjusted successfully');
      setShowAdjustment(false);
      resetAdjustmentForm();
      loadUserWallets();
    } catch (error: any) {
      console.error('Error adjusting wallet balance:', error);
      toast.error(error.message || 'Failed to adjust wallet balance');
    }
  };

  const resetAdjustmentForm = () => {
    setSelectedWallet(null);
    setAdjustmentType('add');
    setAdjustmentAmount('');
    setAdjustmentReason('');
    setAdjustmentReference('');
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: 'bg-green-500',
      suspended: 'bg-yellow-500',
      blocked: 'bg-red-500',
      frozen: 'bg-blue-500'
    };
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || 'bg-gray-500'}>
        {status}
      </Badge>
    );
  };

  const exportWalletData = () => {
    const csvData = filteredWallets.map(wallet => ({
      'User Name': wallet.user_name,
      'Email': wallet.user_email,
      'Currency': wallet.currency,
      'Balance': wallet.balance,
      'Status': wallet.status,
      'Created': new Date(wallet.created_at).toLocaleDateString(),
      'Updated': new Date(wallet.updated_at).toLocaleDateString()
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user_wallets_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="animate-pulse">Loading user wallets...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">User Wallet Management</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportWalletData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={loadUserWallets}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users, emails, currency..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Currencies</SelectItem>
                <SelectItem value="UGX">UGX</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="frozen">Frozen</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Date Created</SelectItem>
                <SelectItem value="updated_at">Last Updated</SelectItem>
                <SelectItem value="balance">Balance</SelectItem>
                <SelectItem value="user_name">User Name</SelectItem>
                <SelectItem value="currency">Currency</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Wallets Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{filteredWallets.length}</div>
            <div className="text-sm text-muted-foreground">Total Wallets</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {filteredWallets.filter(w => w.currency === 'UGX').reduce((sum, w) => sum + w.balance, 0).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total UGX</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {filteredWallets.filter(w => w.currency === 'USD').reduce((sum, w) => sum + w.balance, 0).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total USD</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {filteredWallets.filter(w => w.status === 'active').length}
            </div>
            <div className="text-sm text-muted-foreground">Active Wallets</div>
          </CardContent>
        </Card>
      </div>

      {/* Wallets Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Wallets ({filteredWallets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWallets.map((wallet) => (
                <TableRow key={wallet.id}>
                  <TableCell className="font-medium">
                    {wallet.user_name}
                  </TableCell>
                  <TableCell>{wallet.user_email}</TableCell>
                  <TableCell>{wallet.currency}</TableCell>
                  <TableCell className="font-mono">
                    {wallet.balance.toLocaleString()} {wallet.currency}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(wallet.status)}
                  </TableCell>
                  <TableCell>
                    {new Date(wallet.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedWallet(wallet);
                          setAdjustmentType('add');
                          setShowAdjustment(true);
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedWallet(wallet);
                          setAdjustmentType('deduct');
                          setShowAdjustment(true);
                        }}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredWallets.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No wallets found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Balance Adjustment Dialog */}
      <Dialog open={showAdjustment} onOpenChange={setShowAdjustment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustmentType === 'add' ? 'Add to' : 'Deduct from'} Wallet Balance
            </DialogTitle>
          </DialogHeader>
          
          {selectedWallet && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium">{selectedWallet.user_name}</p>
                <p className="text-sm text-muted-foreground">{selectedWallet.user_email}</p>
                <p className="text-sm">
                  Current Balance: {selectedWallet.balance.toLocaleString()} {selectedWallet.currency}
                </p>
              </div>

              <div>
                <Label>Amount to {adjustmentType}</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                />
              </div>

              <div>
                <Label>Reason (Required)</Label>
                <Textarea
                  placeholder="Enter reason for adjustment"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                />
              </div>

              <div>
                <Label>Reference (Optional)</Label>
                <Input
                  placeholder="Enter reference number"
                  value={adjustmentReference}
                  onChange={(e) => setAdjustmentReference(e.target.value)}
                />
              </div>

              {adjustmentAmount && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm">
                    New Balance: {(selectedWallet.balance + (adjustmentType === 'add' ? 1 : -1) * parseFloat(adjustmentAmount || '0')).toLocaleString()} {selectedWallet.currency}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustment(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdjustBalance}>
              {adjustmentType === 'add' ? 'Add Amount' : 'Deduct Amount'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedUserWalletManager;
