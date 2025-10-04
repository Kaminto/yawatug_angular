import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, XCircle, Clock, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;
  amount: number;
  currency: string;
  transaction_type: string;
  status: string;
  approval_status: string;
  reference?: string;
  description?: string;
  metadata?: any;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

const AdminWalletApprovals = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pending');

  useEffect(() => {
    loadTransactions();
    
    // Real-time subscription
    const channel = supabase
      .channel('wallet-approvals')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `approval_status=eq.pending`
      }, () => {
        loadTransactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterType, filterStatus]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('approval_status', filterStatus);
      }

      if (filterType !== 'all') {
        query = query.eq('transaction_type', filterType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (transaction: Transaction) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          approval_status: 'approved',
          status: 'completed'
        })
        .eq('id', transaction.id);

      if (error) throw error;

      // Update wallet balance
      const { error: walletError } = await supabase.rpc('sync_wallet_balance', {
        p_wallet_id: transaction.wallet_id
      });

      if (walletError) throw walletError;

      toast.success('Transaction approved successfully');
      loadTransactions();
    } catch (error: any) {
      console.error('Error approving transaction:', error);
      toast.error(`Failed to approve: ${error.message}`);
    }
  };

  const handleReject = async (transaction: Transaction) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          approval_status: 'rejected',
          status: 'failed'
        })
        .eq('id', transaction.id);

      if (error) throw error;

      toast.success('Transaction rejected');
      loadTransactions();
    } catch (error: any) {
      console.error('Error rejecting transaction:', error);
      toast.error(`Failed to reject: ${error.message}`);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      tx.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const pendingCount = transactions.filter(t => t.approval_status === 'pending').length;
  const approvedCount = transactions.filter(t => t.approval_status === 'approved').length;
  const rejectedCount = transactions.filter(t => t.approval_status === 'rejected').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      deposit: 'bg-blue-50 text-blue-700 border-blue-200',
      withdraw: 'bg-orange-50 text-orange-700 border-orange-200',
      transfer: 'bg-purple-50 text-purple-700 border-purple-200',
      exchange: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    };
    
    return (
      <Badge variant="outline" className={colors[type] || ''}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{approvedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{rejectedCount}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by reference, user name, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="withdraw">Withdraw</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="exchange">Exchange</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transactions List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No transactions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <Card key={transaction.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getTypeBadge(transaction.transaction_type)}
                          {getStatusBadge(transaction.approval_status)}
                          <span className="text-xs text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{transaction.profiles?.full_name || 'Unknown User'}</p>
                          <p className="text-sm text-muted-foreground">{transaction.profiles?.email}</p>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-semibold">
                            {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                          </span>
                          {transaction.reference && (
                            <span className="text-muted-foreground">Ref: {transaction.reference}</span>
                          )}
                        </div>
                        {transaction.description && (
                          <p className="text-sm text-muted-foreground">{transaction.description}</p>
                        )}
                      </div>
                      
                      {transaction.approval_status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="border-green-200 text-green-700 hover:bg-green-50"
                            onClick={() => handleApprove(transaction)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            className="border-red-200 text-red-700 hover:bg-red-50"
                            onClick={() => handleReject(transaction)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWalletApprovals;
