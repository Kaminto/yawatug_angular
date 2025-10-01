
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Eye, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import EnhancedEditRequestModal from './EnhancedEditRequestModal';

interface EditRequest {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  account_type: string;
  user_role: string;
  edit_reason?: string;
  edit_request_status: string;
  last_edit_request: string;
  profile_picture_url?: string;
  nationality?: string;
  country_of_residence?: string;
  gender?: string;
  date_of_birth?: string;
  address?: string;
  tin?: string;
}

const EnhancedUserEditRequests = () => {
  const [editRequests, setEditRequests] = useState<EditRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<EditRequest | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEditRequests();
    
    // Set up subscription for real-time updates
    const subscription = supabase
      .channel('profiles_edit_requests_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'profiles',
          filter: 'edit_requested=eq.true'
        }, 
        () => loadEditRequests()
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadEditRequests = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
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

  const handleReviewRequest = (request: EditRequest) => {
    setSelectedRequest(request);
    setShowReviewModal(true);
  };

  const handleStatusUpdate = (requestId: string, status: string, reason?: string) => {
    // Remove from queue if status changed
    setEditRequests(prev => prev.filter(req => req.id !== requestId));
    loadEditRequests(); // Refresh the list
  };

  const getProfileCompleteness = (request: EditRequest) => {
    const requiredFields = ['full_name', 'phone', 'date_of_birth', 'nationality', 'address', 'account_type'];
    const completedFields = requiredFields.filter(field => request[field as keyof EditRequest]);
    return Math.round((completedFields.length / requiredFields.length) * 100);
  };

  const hasIssues = (request: EditRequest) => {
    return !request.full_name || !request.phone || !request.date_of_birth || !request.nationality || !request.address || !request.account_type;
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
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Enhanced Profile Edit Requests
            <Badge variant="outline" className="ml-auto">
              {editRequests.length} Pending
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editRequests.length === 0 ? (
            <div className="text-center py-8">
              <div className="h-12 w-12 mx-auto text-green-500 mb-2">✓</div>
              <p className="text-gray-500 dark:text-gray-400">No pending edit requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {editRequests.map((request) => {
                const completeness = getProfileCompleteness(request);
                const hasProfileIssues = hasIssues(request);
                
                return (
                  <div
                    key={request.id}
                    className={`border rounded-lg p-4 space-y-3 ${
                      hasProfileIssues ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar>
                          {request.profile_picture_url ? (
                            <AvatarImage src={request.profile_picture_url} alt={request.full_name || ""} />
                          ) : (
                            <AvatarFallback>
                              {(request.full_name || "").substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{request.full_name || 'No Name'}</h3>
                            {hasProfileIssues && (
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{request.email}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                            <Clock className="h-3 w-3" />
                            <span>Requested: {new Date(request.last_edit_request).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>Profile: {completeness}% complete</span>
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-yellow-500">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </div>

                    {request.edit_reason && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border-l-4 border-blue-400">
                        <p className="text-sm">
                          <strong>Reason:</strong> {request.edit_reason}
                        </p>
                      </div>
                    )}

                    {hasProfileIssues && (
                      <div className="text-xs text-yellow-600">
                        Profile requires attention before approval
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReviewRequest(request)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review & Edit
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <EnhancedEditRequestModal
        request={selectedRequest}
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setSelectedRequest(null);
        }}
        onStatusUpdate={handleStatusUpdate}
        onRefresh={loadEditRequests}
      />
    </>
  );
};

export default EnhancedUserEditRequests;
