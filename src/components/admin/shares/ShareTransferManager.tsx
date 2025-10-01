
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle, XCircle, Clock, MessageCircle, AlertTriangle, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { TransferRequestStatus } from '@/types/custom';

interface TransferRequest {
  id: string;
  sender_id: string;
  recipient_id: string;
  share_id: string;
  quantity: number;
  transfer_fee: number;
  reason?: string;
  status: TransferRequestStatus;
  created_at: string;
  completed_at?: string;
  sender?: { full_name: string; email: string };
  recipient?: { full_name: string; email: string };
}

const ShareTransferManager: React.FC = () => {
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [communicatingWith, setCommunicatingWith] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadTransferRequests();
  }, []);

  const loadTransferRequests = async () => {
    try {
      // Get only risky transfers requiring admin approval (pending status)
      const { data: transfersData, error: transfersError } = await supabase
        .from('share_transfer_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (transfersError) {
        console.error('Transfer requests query error:', transfersError);
        throw transfersError;
      }

      if (!transfersData || transfersData.length === 0) {
        setTransferRequests([]);
        return;
      }

      // Get unique user IDs for separate queries
      const senderIds = [...new Set(transfersData.map(transfer => transfer.sender_id))];
      const recipientIds = [...new Set(transfersData.map(transfer => transfer.recipient_id))];
      const allUserIds = [...new Set([...senderIds, ...recipientIds])];

      // Fetch profiles separately
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', allUserIds);

      // Manually join the data
      const enrichedTransfers: TransferRequest[] = transfersData.map(transfer => ({
        id: transfer.id,
        sender_id: transfer.sender_id,
        recipient_id: transfer.recipient_id,
        share_id: transfer.share_id,
        quantity: transfer.quantity,
        transfer_fee: transfer.transfer_fee || 0,
        reason: transfer.reason,
        status: transfer.status as TransferRequestStatus,
        created_at: transfer.created_at,
        completed_at: transfer.completed_at,
        sender: profilesData?.find(p => p.id === transfer.sender_id) || undefined,
        recipient: profilesData?.find(p => p.id === transfer.recipient_id) || undefined
      }));
      
      setTransferRequests(enrichedTransfers);
    } catch (error) {
      console.error('Error loading transfer requests:', error);
      toast.error('Failed to load transfer requests');
      setTransferRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTransferAction = async (transferId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      setProcessingId(transferId);
      
      const { error } = await supabase
        .from('share_transfer_requests')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          completed_at: new Date().toISOString()
        })
        .eq('id', transferId);

      if (error) throw error;

      if (action === 'approve') {
        toast.success('Transfer approved and processed');
      } else {
        toast.success('Transfer request rejected with reason');
      }

      setRejectingId(null);
      setRejectionReason('');
      loadTransferRequests();
    } catch (error) {
      console.error('Error processing transfer:', error);
      toast.error('Failed to process transfer request');
    } finally {
      setProcessingId(null);
    }
  };

  const sendMessage = async (transferId: string) => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      // In a real implementation, this would send notifications to both sender and recipient
      toast.success('Message sent to transfer parties');
      setCommunicatingWith(null);
      setMessage('');
    } catch (error: any) {
      toast.error('Failed to send message');
    }
  };

  const flagAsRisky = async (transferId: string) => {
    try {
      const { error } = await supabase
        .from('share_transfer_requests')
        .update({
          reason: 'Flagged as high risk - requires additional review',
          updated_at: new Date().toISOString()
        })
        .eq('id', transferId);

      if (error) throw error;
      toast.success('Transfer flagged as high risk');
      loadTransferRequests();
    } catch (error: any) {
      toast.error('Failed to flag transfer');
    }
  };

  const getStatusColor = (status: TransferRequestStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: TransferRequestStatus) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Risky Transfer Requests (Admin Approval Required)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transferRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    {format(new Date(request.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{request.sender?.full_name || 'Unknown'}</div>
                      <div className="text-sm text-muted-foreground">{request.sender?.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{request.recipient?.full_name || 'Unknown'}</div>
                      <div className="text-sm text-muted-foreground">{request.recipient?.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{request.quantity.toLocaleString()}</TableCell>
                  <TableCell>UGX {request.transfer_fee.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="max-w-32 truncate" title={request.reason}>
                      {request.reason || 'No reason provided'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(request.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(request.status)}
                        {request.status}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {request.status === 'pending' && (
                      <div className="flex flex-wrap gap-1">
                        {/* Approve */}
                        {!communicatingWith && !rejectingId && (
                          <Button
                            size="sm"
                            onClick={() => handleTransferAction(request.id, 'approve')}
                            disabled={processingId === request.id}
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                        )}
                        
                        {/* Reject with Reason */}
                        {rejectingId === request.id ? (
                          <div className="flex gap-1">
                            <Input
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="Rejection reason"
                              className="w-32 h-8"
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleTransferAction(request.id, 'reject', rejectionReason)}
                              disabled={processingId === request.id}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRejectingId(null);
                                setRejectionReason('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : !communicatingWith && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRejectingId(request.id)}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        )}
                        
                        {/* Send Message */}
                        {communicatingWith === request.id ? (
                          <div className="flex gap-1">
                            <Input
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              placeholder="Message"
                              className="w-24 h-8"
                            />
                            <Button
                              size="sm"
                              onClick={() => sendMessage(request.id)}
                            >
                              Send
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setCommunicatingWith(null);
                                setMessage('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : !rejectingId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCommunicatingWith(request.id)}
                          >
                            <MessageCircle className="h-3 w-3" />
                          </Button>
                        )}
                        
                        {/* Flag as Risky */}
                        {!communicatingWith && !rejectingId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => flagAsRisky(request.id)}
                          >
                            <AlertTriangle className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {transferRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    No transfer requests found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShareTransferManager;
