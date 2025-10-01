
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PendingTransaction {
  id: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  status: string;
  approval_status: string;
  created_at: string;
  description?: string;
  reference?: string;
  admin_notes?: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
}

const TransactionApprovalManager = () => {
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<PendingTransaction | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPendingTransactions();
  }, []);

  const loadPendingTransactions = async () => {
    try {
      // Get transactions that need approval
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .in('approval_status', ['pending', 'review'])
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Get user profiles for each transaction
      const transactionsWithUsers = await Promise.all(
        (transactionsData || []).map(async (transaction) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, phone')
            .eq('id', transaction.user_id)
            .single();

          return {
            ...transaction,
            user_name: profile?.full_name || 'Unknown',
            user_email: profile?.email || 'Unknown',
            user_phone: profile?.phone || 'N/A'
          };
        })
      );

      setPendingTransactions(transactionsWithUsers);
    } catch (error) {
      console.error('Error loading pending transactions:', error);
      toast.error('Failed to load pending transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (action: 'approve' | 'reject') => {
    if (!selectedTransaction) return;

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('process_transaction_approval', {
        p_transaction_id: selectedTransaction.id,
        p_action: action,
        p_admin_notes: adminNotes || null
      });

      if (error) throw error;

      toast.success(`Transaction ${action}d successfully`);
      setShowApprovalDialog(false);
      setSelectedTransaction(null);
      setAdminNotes('');
      loadPendingTransactions();
    } catch (error: any) {
      console.error('Error processing approval:', error);
      toast.error(error.message || `Failed to ${action} transaction`);
    } finally {
      setProcessing(false);
    }
  };

  const filteredTransactions = pendingTransactions.filter(transaction => {
    const matchesSearch = 
      transaction.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || transaction.approval_status === statusFilter;
    const matchesType = typeFilter === 'all' || transaction.transaction_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', icon: Clock, text: 'Pending' },
      review: { color: 'bg-blue-500', icon: Clock, text: 'Under Review' },
      approved: { color: 'bg-green-500', icon: CheckCircle, text: 'Approved' },
      rejected: { color: 'bg-red-500', icon: XCircle, text: 'Rejected' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const getTransactionTypeBadge = (type: string) => {
    const typeConfig = {
      deposit: { color: 'bg-green-100 text-green-800', text: 'Deposit' },
      withdraw: { color: 'bg-red-100 text-red-800', text: 'Withdraw' },
      share_purchase: { color: 'bg-blue-100 text-blue-800', text: 'Share Purchase' },
      transfer: { color: 'bg-purple-100 text-purple-800', text: 'Transfer' }
    };

    const config = typeConfig[type as keyof typeof typeConfig] || { color: 'bg-gray-100 text-gray-800', text: type };
    return <Badge variant="outline" className={config.color}>{config.text}</Badge>;
  };

  if (loading) {
    return <div className="animate-pulse">Loading pending transactions...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Transaction Approvals ({filteredTransactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user, reference, or description..."
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="review">Under Review</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="withdraw">Withdraw</SelectItem>
                <SelectItem value="share_purchase">Share Purchase</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={loadPendingTransactions}>
              Refresh
            </Button>
          </div>

          {/* Transactions Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{transaction.user_name}</div>
                      <div className="text-sm text-muted-foreground">{transaction.user_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getTransactionTypeBadge(transaction.transaction_type)}</TableCell>
                  <TableCell className="font-mono">
                    {transaction.currency} {Math.abs(transaction.amount).toLocaleString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(transaction.approval_status)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {transaction.id.substring(0, 8)}...
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {(() => {
                      try {
                        const notes = JSON.parse(transaction.admin_notes || '{}');
                        return notes.payment_details?.phone || transaction.user_phone || 'N/A';
                      } catch {
                        return transaction.user_phone || 'N/A';
                      }
                    })()}
                  </TableCell>
                  <TableCell>
                    {new Date(transaction.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {transaction.reference || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTransaction(transaction);
                        setShowApprovalDialog(true);
                      }}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No pending transactions found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Transaction</DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">User:</span>
                  <span>{selectedTransaction.user_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Type:</span>
                  <span>{selectedTransaction.transaction_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Amount:</span>
                  <span className="font-mono">
                    {selectedTransaction.currency} {Math.abs(selectedTransaction.amount).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Transaction ID:</span>
                  <span className="font-mono text-sm">{selectedTransaction.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Phone Number:</span>
                  <span className="font-mono">
                    {(() => {
                      try {
                        const notes = JSON.parse(selectedTransaction.admin_notes || '{}');
                        return notes.payment_details?.phone || selectedTransaction.user_phone || 'N/A';
                      } catch {
                        return selectedTransaction.user_phone || 'N/A';
                      }
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Date:</span>
                  <span>{new Date(selectedTransaction.created_at).toLocaleString()}</span>
                </div>
                {selectedTransaction.reference && (
                  <div className="flex justify-between">
                    <span className="font-medium">Reference:</span>
                    <span className="font-mono">{selectedTransaction.reference}</span>
                  </div>
                )}
                {selectedTransaction.description && (
                  <div>
                    <span className="font-medium">Description:</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedTransaction.description}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label>Admin Notes (Optional)</Label>
                <Textarea
                  placeholder="Add notes about this approval decision..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleApproval('reject')}
              disabled={processing}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {processing ? 'Processing...' : 'Reject'}
            </Button>
            <Button
              onClick={() => handleApproval('approve')}
              disabled={processing}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {processing ? 'Processing...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransactionApprovalManager;
