import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
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
  user_profile?: {
    full_name: string;
    email: string;
    phone?: string;
    profile_picture_url?: string;
  };
}
interface PendingApprovalsQueueProps {
  onApprovalUpdate?: () => void;
}
const PendingApprovalsQueue: React.FC<PendingApprovalsQueueProps> = ({
  onApprovalUpdate
}) => {
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<PendingTransaction | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionNotes, setActionNotes] = useState<{
    [key: string]: string;
  }>({});
  useEffect(() => {
    loadPendingTransactions();
  }, []);
  const loadPendingTransactions = async () => {
    try {
      // Get transactions with pending approval
      const {
        data: transactions,
        error: transError
      } = await supabase.from('transactions').select('*').eq('approval_status', 'pending').order('created_at', {
        ascending: false
      });
      if (transError) {
        console.error('Error loading transactions:', transError);
        throw transError;
      }
      console.log('Loaded pending transactions:', transactions);
      if (!transactions || transactions.length === 0) {
        setPendingTransactions([]);
        return;
      }

      // Get user profiles for each transaction
      const userIds = [...new Set(transactions.map(t => t.user_id))];
      const {
        data: profiles,
        error: profilesError
      } = await supabase.from('profiles').select('id, full_name, email, phone, profile_picture_url').in('id', userIds);
      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        throw profilesError;
      }
      console.log('Loaded profiles:', profiles);

      // Combine the data
      const transformedData = transactions.map(transaction => ({
        ...transaction,
        user_profile: profiles?.find(p => p.id === transaction.user_id) || {
          full_name: 'Unknown User',
          email: 'unknown@email.com'
        }
      }));
      setPendingTransactions(transformedData);
    } catch (error: any) {
      console.error('Error loading pending transactions:', error);
      toast.error(`Failed to load pending transactions: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  const handleApproval = async (transactionId: string, action: 'approve' | 'reject') => {
    try {
      const transaction = pendingTransactions.find(t => t.id === transactionId);
      if (!transaction) throw new Error('Transaction not found');
      const notes = actionNotes[transactionId] || '';
      console.log(`${action}ing transaction:`, transactionId, 'with notes:', notes);

      // Use the new database function for approval processing
      const { data, error } = await supabase.rpc('process_transaction_approval', {
        p_transaction_id: transactionId,
        p_action: action,
        p_admin_notes: notes
      });

      if (error) {
        console.error('Error processing transaction approval:', error);
        throw error;
      }

      console.log('Transaction approval processed successfully:', data);
      toast.success(`Transaction ${action}d successfully`);

      // Clear notes for this transaction
      setActionNotes(prev => {
        const newNotes = {
          ...prev
        };
        delete newNotes[transactionId];
        return newNotes;
      });

      // Remove the transaction from the list immediately
      setPendingTransactions(prev => prev.filter(t => t.id !== transactionId));

      // Call the callback to update parent components
      if (onApprovalUpdate) {
        onApprovalUpdate();
      }
    } catch (error: any) {
      console.error(`Error ${action}ing transaction:`, error);
      toast.error(`Failed to ${action} transaction: ${error.message}`);
    }
  };
  const formatAmount = (amount: number, currency: string) => {
    return `${amount.toLocaleString()} ${currency}`;
  };
  const getPaymentDetails = (adminNotes: string) => {
    try {
      const notes = JSON.parse(adminNotes || '{}');
      return {
        method: notes.payment_method || 'Unknown',
        details: notes.payment_details || {}
      };
    } catch {
      return {
        method: 'Unknown',
        details: {}
      };
    }
  };
  const handleViewDetails = (transaction: PendingTransaction) => {
    setSelectedTransaction(transaction);
    setShowModal(true);
  };
  const handleApprovalComplete = () => {
    setShowModal(false);
    loadPendingTransactions();
    if (onApprovalUpdate) {
      onApprovalUpdate();
    }
  };
  if (loading) {
    return <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-40">
            <div className="h-8 w-8 border-4 border-yawatu-gold border-t-transparent rounded-full animate-spin"></div>
          </div>
        </CardContent>
      </Card>;
  }
  return <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Pending Approvals</CardTitle>
          <Badge variant="outline" className="bg-orange-500/20 text-orange-700">
            {pendingTransactions.length} Pending
          </Badge>
        </CardHeader>
        <CardContent>
          {pendingTransactions.length === 0 ? <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
              <p className="text-muted-foreground">No pending approvals</p>
            </div> : <div className="space-y-4">
              {pendingTransactions.map(transaction => {
                  const paymentInfo = getPaymentDetails(transaction.admin_notes || '');
                return <div key={`transaction-${transaction.id}`} className="flex flex-col gap-4 p-4 border rounded-lg bg-card/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            {transaction.user_profile?.profile_picture_url ? <AvatarImage src={transaction.user_profile.profile_picture_url} alt={transaction.user_profile.full_name || ""} /> : <AvatarFallback>
                                {(transaction.user_profile?.full_name || "").substring(0, 2).toUpperCase()}
                              </AvatarFallback>}
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{transaction.user_profile?.full_name || "Unknown User"}</p>
                            <p className="text-sm text-muted-foreground">{transaction.user_profile?.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="capitalize">
                              {transaction.transaction_type}
                            </Badge>
                            <span className="text-sm font-medium text-foreground">
                              {formatAmount(transaction.amount, transaction.currency)}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 mt-1">
                            <p className="text-xs text-muted-foreground">
                              Method: {paymentInfo.method.replace('_', ' ')}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              Transaction ID: {transaction.id.substring(0, 12)}...
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              Phone: {(() => {
                                try {
                                  const notes = JSON.parse(transaction.admin_notes || '{}');
                                  return notes.payment_details?.phone || transaction.user_profile?.phone || 'N/A';
                                } catch {
                                  return transaction.user_profile?.phone || 'N/A';
                                }
                              })()}
                            </p>
                            {transaction.reference && <p className="text-xs text-muted-foreground font-mono">
                                Ref: {transaction.reference}
                              </p>}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {transaction.approval_status}
                        </Badge>
                        
                      </div>
                    </div>

                      <div className="space-y-3">
                        <div>
                          <Label className="text-foreground">Admin Notes (Optional)</Label>
                          <Textarea placeholder="Add notes for this approval/rejection..." value={actionNotes[transaction.id] || ''} onChange={e => setActionNotes(prev => ({
                      ...prev,
                      [transaction.id]: e.target.value
                    }))} rows={2} className="bg-background text-foreground" />
                        </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleApproval(transaction.id, 'reject')} className="flex-1">
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button size="sm" onClick={() => handleApproval(transaction.id, 'approve')} className="flex-1">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>;
          })}
            </div>}
        </CardContent>
      </Card>

      <TransactionApprovalModal isOpen={showModal} onClose={() => setShowModal(false)} transaction={selectedTransaction} onApprovalComplete={handleApprovalComplete} />
    </>;
};
export default PendingApprovalsQueue;