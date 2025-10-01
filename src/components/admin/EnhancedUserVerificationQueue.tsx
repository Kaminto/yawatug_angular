
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CalendarDays, CheckCircle, XCircle, AlertCircle, Eye, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from 'sonner';

const EnhancedUserVerificationQueue: React.FC = () => {
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingUser, setProcessingUser] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingVerifications();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('verification_queue_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'profiles',
          filter: 'status=eq.pending_verification'
        }, 
        () => {
          fetchPendingVerifications();
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchPendingVerifications = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_documents (
            id,
            type,
            status,
            uploaded_at,
            url
          )
        `)
        .eq('status', 'pending_verification')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      setPendingUsers(data || []);
    } catch (error: any) {
      console.error("Error fetching verification queue:", error);
      toast.error('Failed to load verification queue');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId: string) => {
    setProcessingUser(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: 'active',
          is_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User verified successfully');
      fetchPendingVerifications();
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to verify user');
    } finally {
      setProcessingUser(null);
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessingUser(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: 'unverified',
          is_verified: false,
          edit_reason: rejectionReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User verification rejected');
      setRejectionReason('');
      setShowRejectDialog(null);
      fetchPendingVerifications();
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error('Failed to reject verification');
    } finally {
      setProcessingUser(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDocumentCounts = (documents: any[]) => {
    const total = documents.length;
    const approved = documents.filter(doc => doc.status === 'approved').length;
    const pending = documents.filter(doc => doc.status === 'pending').length;
    const rejected = documents.filter(doc => doc.status === 'rejected').length;
    
    return { total, approved, pending, rejected };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verification Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-40">
            <div className="h-8 w-8 border-4 border-yawatu-gold border-t-transparent rounded-full animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Enhanced Verification Queue</CardTitle>
        <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700">
          {pendingUsers.length} Pending
        </Badge>
      </CardHeader>
      <CardContent>
        {pendingUsers.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
            <p className="text-gray-500">No pending verifications</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingUsers.map((user) => {
              const docStats = getDocumentCounts(user.user_documents || []);
              
              return (
                <div
                  key={user.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Avatar>
                        {user.profile_picture_url ? (
                          <AvatarImage src={user.profile_picture_url} alt={user.full_name || ""} />
                        ) : (
                          <AvatarFallback>
                            {(user.full_name || "").substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.full_name || "No Name"}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <p className="text-xs text-gray-400">
                          Account Type: {user.user_type}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <CalendarDays className="h-3 w-3" />
                          <span>Submitted: {formatDate(user.updated_at)}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-yellow-500">
                      Pending Review
                    </Badge>
                  </div>

                  {/* Document Status Summary */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span>{docStats.total} Documents</span>
                    </div>
                    {docStats.approved > 0 && (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {docStats.approved} Approved
                      </Badge>
                    )}
                    {docStats.pending > 0 && (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                        {docStats.pending} Pending
                      </Badge>
                    )}
                    {docStats.rejected > 0 && (
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        {docStats.rejected} Rejected
                      </Badge>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      onClick={() => handleApproveUser(user.id)}
                      disabled={processingUser === user.id}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    
                    <AlertDialog open={showRejectDialog === user.id} onOpenChange={(open) => !open && setShowRejectDialog(null)}>
                      <AlertDialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setShowRejectDialog(user.id)}
                          disabled={processingUser === user.id}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reject Verification</AlertDialogTitle>
                          <AlertDialogDescription>
                            Please provide a reason for rejecting this user's verification.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4">
                          <Label>Rejection Reason</Label>
                          <Textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Explain why the verification is being rejected..."
                            rows={3}
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => {
                            setRejectionReason('');
                            setShowRejectDialog(null);
                          }}>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRejectUser(user.id)}
                            disabled={!rejectionReason.trim() || processingUser === user.id}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {processingUser === user.id ? 'Rejecting...' : 'Reject'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    
                    <Button asChild variant="secondary" size="sm">
                      <Link to={`/admin/verify/${user.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Review Details
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedUserVerificationQueue;
