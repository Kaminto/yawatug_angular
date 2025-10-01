
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, User } from 'lucide-react';

interface EditRequest {
  id: string;
  full_name: string;
  email: string;
  edit_reason?: string;
  edit_request_status: string;
  last_edit_request: string;
}

const UserEditRequestsManager = () => {
  const [editRequests, setEditRequests] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null);

  useEffect(() => {
    loadEditRequests();
  }, []);

  const loadEditRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, edit_reason, edit_request_status, last_edit_request')
        .eq('edit_requested', true)
        .eq('edit_request_status', 'pending')
        .order('last_edit_request', { ascending: false });

      if (error) throw error;
      setEditRequests(data || []);
    } catch (error) {
      console.error('Error loading edit requests:', error);
      toast.error('Failed to load edit requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (userId: string) => {
    setProcessingRequest(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          edit_request_status: 'approved',
          edit_approved: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Edit request approved successfully');
      loadEditRequests();
    } catch (error) {
      console.error('Error approving edit request:', error);
      toast.error('Failed to approve edit request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (userId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessingRequest(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          edit_request_status: 'rejected',
          edit_approved: false,
          edit_requested: false,
          edit_reason: rejectionReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Edit request rejected');
      setRejectionReason('');
      setShowRejectForm(null);
      loadEditRequests();
    } catch (error) {
      console.error('Error rejecting edit request:', error);
      toast.error('Failed to reject edit request');
    } finally {
      setProcessingRequest(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-40">
            <div className="animate-pulse">Loading edit requests...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile Edit Requests
          <Badge variant="outline" className="ml-auto">
            {editRequests.length} Pending
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {editRequests.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
            <p className="text-gray-500 dark:text-gray-400">No pending edit requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {editRequests.map((request) => (
              <div
                key={request.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{request.full_name || 'No Name'}</h3>
                    <p className="text-sm text-gray-500">{request.email}</p>
                    <p className="text-xs text-gray-400">
                      Requested: {new Date(request.last_edit_request).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className="bg-yellow-500">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                </div>

                {request.edit_reason && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                    <p className="text-sm">
                      <strong>Reason:</strong> {request.edit_reason}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApproveRequest(request.id)}
                    disabled={processingRequest === request.id}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRejectForm(request.id)}
                    disabled={processingRequest === request.id}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>

                {showRejectForm === request.id && (
                  <div className="border-t pt-3 space-y-2">
                    <Textarea
                      placeholder="Provide reason for rejection..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectRequest(request.id)}
                        disabled={!rejectionReason.trim() || processingRequest === request.id}
                      >
                        {processingRequest === request.id ? 'Rejecting...' : 'Confirm Reject'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowRejectForm(null);
                          setRejectionReason('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserEditRequestsManager;
