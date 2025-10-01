
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Eye, 
  Filter,
  DollarSign,
  TrendingUp,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import TransactionApprovalModal from '@/components/wallet/TransactionApprovalModal';

interface PendingTransaction {
  id: string;
  user_id: string;
  wallet_id: string;
  amount: number;
  currency: string;
  transaction_type: string;
  status: string;
  approval_status: string;
  reference?: string;
  admin_notes?: string;
  created_at: string;
  risk_score?: number;
  user_profile?: {
    full_name: string;
    email: string;
    profile_picture_url?: string;
  };
}

interface ApprovalStats {
  total_pending: number;
  high_risk_count: number;
  total_value: number;
  oldest_pending: string;
}

const TransactionApprovalWorkflow: React.FC = () => {
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<PendingTransaction | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);
  const [stats, setStats] = useState<ApprovalStats>({
    total_pending: 0,
    high_risk_count: 0,
    total_value: 0,
    oldest_pending: ''
  });

  useEffect(() => {
    loadPendingTransactions();
    setupRealTimeSubscription();
  }, []);

  const loadPendingTransactions = async () => {
    try {
      setLoading(true);

      // Load pending transactions
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get user profiles
      const userIds = [...new Set(transactions?.map(t => t.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, profile_picture_url')
        .in('id', userIds);

      // Enrich transactions with user data and risk scores
      const enrichedTransactions = (transactions || []).map(tx => ({
        ...tx,
        user_profile: profiles?.find(p => p.id === tx.user_id) || {
          full_name: 'Unknown User',
          email: 'unknown@email.com'
        },
        risk_score: calculateRiskScore(tx)
      }));

      setPendingTransactions(enrichedTransactions);
      calculateStats(enrichedTransactions);
    } catch (error) {
      console.error('Error loading pending transactions:', error);
      toast.error('Failed to load pending transactions');
    } finally {
      setLoading(false);
    }
  };

  const calculateRiskScore = (transaction: any): number => {
    let score = 0;
    
    // Amount-based risk
    if (transaction.amount > 10000000) score += 40; // > 10M UGX
    else if (transaction.amount > 5000000) score += 25; // > 5M UGX
    else if (transaction.amount > 1000000) score += 15; // > 1M UGX
    
    // Transaction type risk
    if (transaction.transaction_type === 'withdraw') score += 20;
    else if (transaction.transaction_type === 'transfer') score += 15;
    
    // Time-based risk (late night transactions)
    const hour = new Date(transaction.created_at).getHours();
    if (hour < 6 || hour > 22) score += 10;
    
    return Math.min(score, 100);
  };

  const calculateStats = (transactions: PendingTransaction[]) => {
    const stats: ApprovalStats = {
      total_pending: transactions.length,
      high_risk_count: transactions.filter(tx => (tx.risk_score || 0) > 70).length,
      total_value: transactions.reduce((sum, tx) => sum + tx.amount, 0),
      oldest_pending: transactions.length > 0 ? transactions[0].created_at : ''
    };
    setStats(stats);
  };

  const setupRealTimeSubscription = () => {
    const channel = supabase
      .channel('transaction-approvals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        () => {
          loadPendingTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSingleApproval = async (transactionId: string, action: 'approve' | 'reject', notes?: string) => {
    setProcessing(transactionId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const transaction = pendingTransactions.find(t => t.id === transactionId);
      if (!transaction) throw new Error('Transaction not found');

      // Update transaction status
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          approval_status: action === 'approve' ? 'approved' : 'rejected',
          status: action === 'approve' ? 'completed' : 'failed',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          admin_notes: notes || ''
        })
        .eq('id', transactionId);

      if (updateError) throw updateError;

      // If approved, update wallet balance
      if (action === 'approve') {
        await updateWalletBalance(transaction);
      }

      toast.success(`Transaction ${action}d successfully`);
      loadPendingTransactions();
    } catch (error: any) {
      console.error(`Error ${action}ing transaction:`, error);
      toast.error(`Failed to ${action} transaction: ${error.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkApproval = async (action: 'approve' | 'reject') => {
    if (bulkSelected.length === 0) {
      toast.error('No transactions selected');
      return;
    }

    try {
      for (const transactionId of bulkSelected) {
        await handleSingleApproval(transactionId, action);
      }
      setBulkSelected([]);
      toast.success(`${bulkSelected.length} transactions ${action}d successfully`);
    } catch (error) {
      toast.error(`Failed to ${action} some transactions`);
    }
  };

  const updateWalletBalance = async (transaction: PendingTransaction) => {
    try {
      // Get current wallet balance
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', transaction.wallet_id)
        .single();

      if (walletError) throw walletError;

      let newBalance = wallet.balance;
      
      if (transaction.transaction_type === 'deposit') {
        newBalance += transaction.amount;
      } else if (transaction.transaction_type === 'withdraw') {
        newBalance -= transaction.amount;
      }

      // Update wallet balance
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.wallet_id);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error updating wallet balance:', error);
      throw error;
    }
  };

  const filteredTransactions = pendingTransactions.filter(tx => {
    if (filterType === 'all') return true;
    if (filterType === 'high-risk') return (tx.risk_score || 0) > 70;
    if (filterType === 'deposits') return tx.transaction_type === 'deposit';
    if (filterType === 'withdrawals') return tx.transaction_type === 'withdraw';
    if (filterType === 'large-amounts') return tx.amount > 1000000;
    return true;
  });

  const handleViewDetails = (transaction: PendingTransaction) => {
    setSelectedTransaction(transaction);
    setShowModal(true);
  };

  const getRiskBadge = (score: number) => {
    if (score > 70) return <Badge variant="destructive">High Risk</Badge>;
    if (score > 40) return <Badge className="bg-yellow-500 text-white">Medium Risk</Badge>;
    return <Badge variant="secondary">Low Risk</Badge>;
  };

  if (loading) {
    return <div className="animate-pulse">Loading transaction approval workflow...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Approvals</p>
                <p className="text-2xl font-bold text-orange-600">{stats.total_pending}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Risk</p>
                <p className="text-2xl font-bold text-red-600">{stats.high_risk_count}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">UGX {stats.total_value.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Oldest Pending</p>
                <p className="text-lg font-bold">
                  {stats.oldest_pending ? 
                    `${Math.floor((Date.now() - new Date(stats.oldest_pending).getTime()) / (1000 * 60 * 60 * 24))} days` 
                    : 'N/A'
                  }
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {stats.high_risk_count > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {stats.high_risk_count} high-risk transaction(s) requiring immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Approval Interface */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transaction Approval Queue</CardTitle>
            <div className="flex gap-2">
              {/* Filter Buttons */}
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
              >
                All ({pendingTransactions.length})
              </Button>
              <Button
                variant={filterType === 'high-risk' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('high-risk')}
              >
                High Risk ({stats.high_risk_count})
              </Button>
              <Button
                variant={filterType === 'deposits' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('deposits')}
              >
                Deposits
              </Button>
              <Button
                variant={filterType === 'withdrawals' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('withdrawals')}
              >
                Withdrawals
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Bulk Actions */}
          {bulkSelected.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="font-medium">{bulkSelected.length} transaction(s) selected</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBulkSelected([])}
                  >
                    Clear Selection
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleBulkApproval('reject')}
                  >
                    Bulk Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleBulkApproval('approve')}
                  >
                    Bulk Approve
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Transaction List */}
          <div className="space-y-4">
            {filteredTransactions.map((transaction) => (
              <TransactionApprovalCard
                key={`approval-${transaction.id}`}
                transaction={transaction}
                isSelected={bulkSelected.includes(transaction.id)}
                onSelect={(selected) => {
                  if (selected) {
                    setBulkSelected([...bulkSelected, transaction.id]);
                  } else {
                    setBulkSelected(bulkSelected.filter(id => id !== transaction.id));
                  }
                }}
                onApprove={(notes) => handleSingleApproval(transaction.id, 'approve', notes)}
                onReject={(notes) => handleSingleApproval(transaction.id, 'reject', notes)}
                onViewDetails={() => handleViewDetails(transaction)}
                processing={processing === transaction.id}
                getRiskBadge={getRiskBadge}
              />
            ))}

            {filteredTransactions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {pendingTransactions.length === 0 
                  ? "No pending transactions requiring approval."
                  : "No transactions match the current filter."
                }
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transaction Details Modal */}
      <TransactionApprovalModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        transaction={selectedTransaction}
        onApprovalComplete={() => {
          setShowModal(false);
          loadPendingTransactions();
        }}
      />
    </div>
  );
};

// Individual Transaction Card Component
interface TransactionApprovalCardProps {
  transaction: PendingTransaction;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onApprove: (notes?: string) => void;
  onReject: (notes?: string) => void;
  onViewDetails: () => void;
  processing: boolean;
  getRiskBadge: (score: number) => React.ReactNode;
}

const TransactionApprovalCard: React.FC<TransactionApprovalCardProps> = ({
  transaction,
  isSelected,
  onSelect,
  onApprove,
  onReject,
  onViewDetails,
  processing,
  getRiskBadge
}) => {
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  return (
    <div className={`border rounded-lg p-4 ${isSelected ? 'bg-accent/50 border-accent' : 'hover:bg-muted/50'}`}>
      <div className="flex items-start gap-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
          className="mt-1"
        />
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <p className="font-medium text-foreground">{transaction.user_profile?.full_name}</p>
            <p className="text-sm text-muted-foreground">{transaction.user_profile?.email}</p>
            {getRiskBadge(transaction.risk_score || 0)}
            <Badge variant="outline" className="capitalize">
              {transaction.transaction_type}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
            <div>
              <p className="text-muted-foreground">Amount</p>
              <p className="font-medium">{transaction.currency} {transaction.amount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">{new Date(transaction.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Risk Score</p>
              <p className="font-medium">{transaction.risk_score || 0}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Reference</p>
              <p className="font-medium">{transaction.reference || 'N/A'}</p>
            </div>
          </div>

          {showNotes && (
            <div className="mb-3">
              <Textarea
                placeholder="Add approval/rejection notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button variant="outline" size="sm" onClick={onViewDetails}>
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setShowNotes(!showNotes)}
          >
            {showNotes ? 'Hide' : 'Add'} Notes
          </Button>

          <div className="flex gap-1">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onReject(notes)}
              disabled={processing}
            >
              <XCircle className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={() => onApprove(notes)}
              disabled={processing}
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionApprovalWorkflow;
