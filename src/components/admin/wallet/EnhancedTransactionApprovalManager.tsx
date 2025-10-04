import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Filter,
  ChevronDown,
  Users,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  CheckSquare,
  Square
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
  risk_score?: number;
  fee_amount?: number;
  metadata?: any;
}

interface FilterOptions {
  search: string;
  status: string;
  type: string;
  amountRange: string;
  currency: string;
  riskLevel: string;
  dateRange: string;
}

interface BulkActionStats {
  selectedCount: number;
  totalAmount: { [currency: string]: number };
  avgRiskScore: number;
}

const EnhancedTransactionApprovalManager = () => {
  const [transactions, setTransactions] = useState<PendingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    status: 'all',
    type: 'all',
    amountRange: 'all',
    currency: 'all',
    riskLevel: 'all',
    dateRange: 'all'
  });
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<PendingTransaction | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject'>('approve');

  useEffect(() => {
    loadTransactions();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadTransactions, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadTransactions = async () => {
    try {
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .in('approval_status', ['pending', 'review', 'auto_approved'])
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Get user profiles and calculate risk scores
      const transactionsWithUsers = await Promise.all(
        (transactionsData || []).map(async (transaction) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, phone, status, profile_completion_percentage')
            .eq('id', transaction.user_id)
            .single();

          // Calculate risk score based on transaction amount, user verification, etc.
          const riskScore = calculateRiskScore(transaction, profile);

          return {
            ...transaction,
            user_name: profile?.full_name || 'Unknown',
            user_email: profile?.email || 'Unknown',
            user_phone: profile?.phone || 'N/A',
            risk_score: riskScore
          };
        })
      );

      setTransactions(transactionsWithUsers);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const calculateRiskScore = (transaction: any, profile: any) => {
    let score = 0;
    
    // Amount-based risk
    if (transaction.amount > 1000000) score += 30;
    else if (transaction.amount > 500000) score += 20;
    else if (transaction.amount > 100000) score += 10;
    
    // User verification status
    if (profile?.status !== 'active') score += 25;
    if ((profile?.profile_completion_percentage || 0) < 80) score += 15;
    
    // Transaction type risk
    if (transaction.transaction_type === 'withdraw') score += 20;
    else if (transaction.transaction_type === 'transfer') score += 10;
    
    return Math.min(score, 100);
  };

  const handleSingleApproval = async (action: 'approve' | 'reject') => {
    if (!selectedTransaction) return;

    setProcessing(true);
    try {
      const { error } = await supabase.rpc('process_transaction_approval', {
        p_transaction_id: selectedTransaction.id,
        p_action: action,
        p_admin_notes: adminNotes || null
      });

      if (error) throw error;

      toast.success(`Transaction ${action}d successfully`);
      setShowApprovalDialog(false);
      setSelectedTransaction(null);
      setAdminNotes('');
      await loadTransactions();
    } catch (error: any) {
      console.error('Error processing approval:', error);
      toast.error(error.message || `Failed to ${action} transaction`);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkApproval = async () => {
    if (selectedTransactions.size === 0) return;

    setProcessing(true);
    try {
      const selectedIds = Array.from(selectedTransactions);
      const results = await Promise.allSettled(
        selectedIds.map(id => 
          supabase.rpc('process_transaction_approval', {
            p_transaction_id: id,
            p_action: bulkAction,
            p_admin_notes: `Bulk ${bulkAction} operation`
          })
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (successful > 0) {
        toast.success(`${successful} transactions ${bulkAction}d successfully`);
      }
      if (failed > 0) {
        toast.error(`${failed} transactions failed to process`);
      }

      setShowBulkDialog(false);
      setSelectedTransactions(new Set());
      await loadTransactions();
    } catch (error) {
      console.error('Error processing bulk approval:', error);
      toast.error('Failed to process bulk action');
    } finally {
      setProcessing(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    // Search filter
    const searchMatch = 
      transaction.user_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      transaction.user_email?.toLowerCase().includes(filters.search.toLowerCase()) ||
      transaction.reference?.toLowerCase().includes(filters.search.toLowerCase()) ||
      transaction.description?.toLowerCase().includes(filters.search.toLowerCase());
    
    // Status filter
    const statusMatch = filters.status === 'all' || transaction.approval_status === filters.status;
    
    // Type filter
    const typeMatch = filters.type === 'all' || transaction.transaction_type === filters.type;
    
    // Amount range filter
    const amountMatch = filters.amountRange === 'all' || (() => {
      const amount = Math.abs(transaction.amount);
      switch (filters.amountRange) {
        case 'small': return amount < 100000;
        case 'medium': return amount >= 100000 && amount < 500000;
        case 'large': return amount >= 500000 && amount < 1000000;
        case 'xlarge': return amount >= 1000000;
        default: return true;
      }
    })();
    
    // Currency filter
    const currencyMatch = filters.currency === 'all' || transaction.currency === filters.currency;
    
    // Risk level filter
    const riskMatch = filters.riskLevel === 'all' || (() => {
      const risk = transaction.risk_score || 0;
      switch (filters.riskLevel) {
        case 'low': return risk < 30;
        case 'medium': return risk >= 30 && risk < 60;
        case 'high': return risk >= 60;
        default: return true;
      }
    })();
    
    return searchMatch && statusMatch && typeMatch && amountMatch && currencyMatch && riskMatch;
  });

  const bulkStats: BulkActionStats = {
    selectedCount: selectedTransactions.size,
    totalAmount: {},
    avgRiskScore: 0
  };

  // Calculate bulk stats
  const selectedTxns = transactions.filter(t => selectedTransactions.has(t.id));
  selectedTxns.forEach(txn => {
    bulkStats.totalAmount[txn.currency] = (bulkStats.totalAmount[txn.currency] || 0) + Math.abs(txn.amount);
  });
  
  if (selectedTxns.length > 0) {
    bulkStats.avgRiskScore = selectedTxns.reduce((sum, txn) => sum + (txn.risk_score || 0), 0) / selectedTxns.length;
  }

  const toggleSelectAll = () => {
    if (selectedTransactions.size === filteredTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  const toggleSelectTransaction = (id: string) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTransactions(newSelected);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'default' as const, icon: Clock, text: 'Pending' },
      review: { variant: 'secondary' as const, icon: Clock, text: 'Under Review' },
      approved: { variant: 'default' as const, icon: CheckCircle, text: 'Approved' },
      rejected: { variant: 'destructive' as const, icon: XCircle, text: 'Rejected' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const getRiskBadge = (riskScore: number) => {
    if (riskScore < 30) return <Badge variant="secondary" className="bg-green-100 text-green-800">Low Risk</Badge>;
    if (riskScore < 60) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>;
    return <Badge variant="destructive">High Risk</Badge>;
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
    return <div className="animate-pulse">Loading transactions...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Enhanced Transaction Approvals
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredTransactions.length} transactions • {selectedTransactions.size} selected
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadTransactions}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {selectedTransactions.size > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowBulkDialog(true)}
                >
                  Bulk Actions ({selectedTransactions.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="font-bold">{transactions.filter(t => t.approval_status === 'pending').length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">High Risk</p>
                <p className="font-bold">{transactions.filter(t => (t.risk_score || 0) >= 60).length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-bold">
                  UGX {transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Fees</p>
                <p className="font-bold text-orange-600">
                  UGX {transactions.reduce((sum, t) => sum + (t.fee_amount || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Unique Users</p>
                <p className="font-bold">{new Set(transactions.map(t => t.user_id)).size}</p>
              </div>
            </div>
          </div>

          {/* Enhanced Filters */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-9"
              />
            </div>
            
            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="review">Under Review</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
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
            
            <Select value={filters.amountRange} onValueChange={(value) => setFilters(prev => ({ ...prev, amountRange: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Amount" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Amounts</SelectItem>
                <SelectItem value="small">&lt; 100K</SelectItem>
                <SelectItem value="medium">100K - 500K</SelectItem>
                <SelectItem value="large">500K - 1M</SelectItem>
                <SelectItem value="xlarge">&gt; 1M</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.riskLevel} onValueChange={(value) => setFilters(prev => ({ ...prev, riskLevel: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.currency} onValueChange={(value) => setFilters(prev => ({ ...prev, currency: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Currencies</SelectItem>
                <SelectItem value="UGX">UGX</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transactions Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedTransactions.size === filteredTransactions.length && filteredTransactions.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Checkbox
                      checked={selectedTransactions.has(transaction.id)}
                      onCheckedChange={() => toggleSelectTransaction(transaction.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{transaction.user_name}</div>
                      <div className="text-sm text-muted-foreground">{transaction.user_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {getTransactionTypeBadge(transaction.transaction_type)}
                      {transaction.approval_status === 'auto_approved' && (
                        <Badge variant="secondary" className="text-xs">
                          Auto
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">
                    <div className="font-bold">
                      {transaction.currency} {Math.abs(transaction.amount).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-orange-600">
                    {transaction.currency} {(transaction.fee_amount || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono text-green-600 font-medium">
                    {transaction.currency} {(Math.abs(transaction.amount) - (transaction.fee_amount || 0)).toLocaleString()}
                  </TableCell>
                  <TableCell>{getRiskBadge(transaction.risk_score || 0)}</TableCell>
                  <TableCell>{getStatusBadge(transaction.approval_status)}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(transaction.created_at).toLocaleDateString()}
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
              <p className="text-muted-foreground">No transactions match your filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Single Transaction Review Dialog */}
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
                  <span className="capitalize">{selectedTransaction.transaction_type}</span>
                </div>
                
                {/* Fee Breakdown */}
                <div className="border-t pt-2 mt-2">
                  <p className="text-sm font-medium mb-2">Transaction Breakdown:</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Gross Amount:</span>
                      <span className="font-mono font-medium">
                        {selectedTransaction.currency} {Math.abs(selectedTransaction.amount).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Transaction Fee:</span>
                      <span className="font-mono font-medium text-orange-600">
                        {selectedTransaction.currency} {(selectedTransaction.fee_amount || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-medium border-t pt-1">
                      <span>Net Amount:</span>
                      <span className="font-mono text-green-600">
                        {selectedTransaction.currency} {(Math.abs(selectedTransaction.amount) - (selectedTransaction.fee_amount || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Risk Score:</span>
                  {getRiskBadge(selectedTransaction.risk_score || 0)}
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Merchant Transaction ID:</span>
                  <span className="font-mono text-sm">
                    {(() => {
                      try {
                        const notes = JSON.parse(selectedTransaction.admin_notes || '{}');
                        return notes.transaction_id || selectedTransaction.reference || 'N/A';
                      } catch {
                        return selectedTransaction.reference || 'N/A';
                      }
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Sender Phone Number:</span>
                  <span className="font-mono">
                    {(() => {
                      try {
                        const notes = JSON.parse(selectedTransaction.admin_notes || '{}');
                        return notes.phone_number || notes.payment_details?.phone || 'N/A';
                      } catch {
                        return 'N/A';
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
              onClick={() => handleSingleApproval('reject')}
              disabled={processing}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {processing ? 'Processing...' : 'Reject'}
            </Button>
            <Button
              onClick={() => handleSingleApproval('approve')}
              disabled={processing}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {processing ? 'Processing...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Transaction Actions</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Selected Transactions Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Count:</span>
                  <span className="ml-2 font-bold">{bulkStats.selectedCount}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg Risk:</span>
                  <span className="ml-2 font-bold">{Math.round(bulkStats.avgRiskScore)}%</span>
                </div>
                {Object.entries(bulkStats.totalAmount).map(([currency, amount]) => (
                  <div key={currency}>
                    <span className="text-muted-foreground">Total {currency}:</span>
                    <span className="ml-2 font-bold">{amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Action</Label>
              <Select value={bulkAction} onValueChange={(value: 'approve' | 'reject') => setBulkAction(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve">Approve All</SelectItem>
                  <SelectItem value="reject">Reject All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
            <Button
              variant={bulkAction === 'approve' ? 'default' : 'destructive'}
              onClick={handleBulkApproval}
              disabled={processing}
            >
              {processing ? 'Processing...' : `${bulkAction === 'approve' ? 'Approve' : 'Reject'} ${selectedTransactions.size} Transactions`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedTransactionApprovalManager;