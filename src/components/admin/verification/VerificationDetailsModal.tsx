
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle, XCircle, FileText, Eye, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VerificationRequest {
  id: string;
  user_id: string;
  status: string;
  submitted_at: string;
  admin_notes?: string;
  rejection_reason?: string;
  user_profile: {
    full_name: string;
    email: string;
    phone: string;
    account_type: string;
    profile_picture_url?: string;
  };
  user_documents: Array<{
    id: string;
    type: string;
    url: string;
    status: string;
    document_number?: string;
    uploaded_at: string;
    feedback?: string;
  }>;
}

interface VerificationDetailsModalProps {
  request: VerificationRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (requestId: string, status: string, notes?: string) => void;
  onRefresh: () => void;
}

const VerificationDetailsModal: React.FC<VerificationDetailsModalProps> = ({
  request,
  isOpen,
  onClose,
  onStatusUpdate,
  onRefresh
}) => {
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [documentFeedback, setDocumentFeedback] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<string | null>(null);
  const [localDocuments, setLocalDocuments] = useState<Array<{
    id: string;
    type: string;
    url: string;
    status: string;
    document_number?: string;
    uploaded_at: string;
    feedback?: string;
  }>>([]);

  React.useEffect(() => {
    if (request) {
      setAdminNotes(request.admin_notes || '');
      setRejectionReason(request.rejection_reason || '');
      setLocalDocuments(request.user_documents);
    }
  }, [request]);

  const handleApproveDocument = async (documentId: string) => {
    try {
      setLoading(true);
      
      // Update local state immediately
      setLocalDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? { ...doc, status: 'approved' }
          : doc
      ));
      
      const { error } = await supabase
        .from('user_documents')
        .update({ status: 'approved' })
        .eq('id', documentId);

      if (error) throw error;

      // Log admin action
      await logAdminAction('approve_document', documentId);
      
      toast.success('Document approved');
      onRefresh();
    } catch (error) {
      console.error('Error approving document:', error);
      toast.error('Failed to approve document');
      // Revert local state on error
      if (request) {
        setLocalDocuments(request.user_documents);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRejectDocument = async (documentId: string) => {
    const feedback = documentFeedback[documentId];
    if (!feedback?.trim()) {
      toast.error('Please provide feedback for document rejection');
      return;
    }

    try {
      setLoading(true);
      
      // Update local state immediately
      setLocalDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? { ...doc, status: 'rejected', feedback }
          : doc
      ));
      
      const { error } = await supabase
        .from('user_documents')
        .update({ 
          status: 'rejected',
          feedback: feedback
        })
        .eq('id', documentId);

      if (error) throw error;

      // Log admin action
      await logAdminAction('reject_document', documentId, feedback);
      
      toast.success('Document rejected');
      setDocumentFeedback(prev => ({ ...prev, [documentId]: '' }));
      onRefresh();
    } catch (error) {
      console.error('Error rejecting document:', error);
      toast.error('Failed to reject document');
      // Revert local state on error
      if (request) {
        setLocalDocuments(request.user_documents);
      }
    } finally {
      setLoading(false);
    }
  };

  const logAdminAction = async (actionType: string, targetDocumentId?: string, notes?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !request) return;

      await supabase
        .from('admin_verification_actions')
        .insert({
          admin_id: user.id,
          user_id: request.user_id,
          action_type: actionType,
          target_document_id: targetDocumentId,
          notes: notes
        });
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  };

  const handleApproveProfile = async () => {
    if (!request) return;
    
    // First update the profile status
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', request.user_id);

      if (error) throw error;

      await logAdminAction('approve_profile', undefined, adminNotes);
      
      onStatusUpdate(request.id, 'approved', adminNotes);
      toast.success('Profile approved successfully');
    } catch (error) {
      console.error('Error approving profile:', error);
      toast.error('Failed to approve profile');
    }
  };

  const handleRejectProfile = async () => {
    if (!request) return;
    
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'blocked' })
        .eq('id', request.user_id);

      if (error) throw error;

      await logAdminAction('reject_profile', undefined, rejectionReason);
      
      onStatusUpdate(request.id, 'rejected', rejectionReason);
      toast.success('Profile rejected');
    } catch (error) {
      console.error('Error rejecting profile:', error);
      toast.error('Failed to reject profile');
    }
  };

  const handleRequestResubmission = async () => {
    if (!request) return;
    
    if (!rejectionReason.trim()) {
      toast.error('Please provide instructions for resubmission');
      return;
    }

    await logAdminAction('request_resubmission', undefined, rejectionReason);
    onStatusUpdate(request.id, 'needs_resubmission', rejectionReason);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar>
              {request.user_profile.profile_picture_url ? (
                <AvatarImage 
                  src={request.user_profile.profile_picture_url} 
                  alt={request.user_profile.full_name} 
                />
              ) : (
                <AvatarFallback>
                  {request.user_profile.full_name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <div>Verification Review - {request.user_profile.full_name}</div>
              <div className="text-sm font-normal text-gray-500">
                Submitted: {new Date(request.submitted_at).toLocaleDateString()}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile Information</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="actions">Admin Actions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Personal Information</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Name:</strong> {request.user_profile.full_name}</p>
                  <p><strong>Email:</strong> {request.user_profile.email}</p>
                  <p><strong>Phone:</strong> {request.user_profile.phone}</p>
                  <p><strong>Account Type:</strong> {request.user_profile.account_type}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Verification Status</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Current Status:</strong> {getStatusBadge(request.status)}</p>
                  <p><strong>Submitted:</strong> {new Date(request.submitted_at).toLocaleDateString()}</p>
                  <p><strong>Documents:</strong> {localDocuments.length} uploaded</p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="documents" className="space-y-4">
            {localDocuments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">No documents uploaded</p>
              </div>
            ) : (
              <div className="space-y-4">
                {localDocuments.map((doc) => (
                  <div key={doc.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h5 className="font-medium">{doc.type.replace('_', ' ').toUpperCase()}</h5>
                        <p className="text-sm text-gray-500">
                          {doc.document_number && `#${doc.document_number} • `}
                          Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(doc.status)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingDocument(doc.url)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                    
                    {doc.feedback && (
                      <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        <strong>Feedback:</strong> {doc.feedback}
                      </div>
                    )}
                    
                    {doc.status === 'pending' && (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Provide feedback if rejecting..."
                          value={documentFeedback[doc.id] || ''}
                          onChange={(e) => setDocumentFeedback(prev => ({ 
                            ...prev, 
                            [doc.id]: e.target.value 
                          }))}
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveDocument(doc.id)}
                            disabled={loading}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectDocument(doc.id)}
                            disabled={loading || !documentFeedback[doc.id]?.trim()}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="actions" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="admin-notes">Admin Notes</Label>
                <Textarea
                  id="admin-notes"
                  placeholder="Add notes about this verification..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="rejection-reason">Rejection Reason / Resubmission Instructions</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Provide reason for rejection or instructions for resubmission..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleApproveProfile}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Profile
                </Button>
                <Button
                  onClick={handleRejectProfile}
                  disabled={loading || !rejectionReason.trim()}
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Profile
                </Button>
                <Button
                  onClick={handleRequestResubmission}
                  disabled={loading || !rejectionReason.trim()}
                  variant="outline"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Request Resubmission
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Document Viewer Modal */}
        {viewingDocument && (
          <Dialog open={!!viewingDocument} onOpenChange={() => setViewingDocument(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Document Viewer</DialogTitle>
              </DialogHeader>
              <div className="flex justify-center">
                <img 
                  src={viewingDocument} 
                  alt="Document" 
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VerificationDetailsModal;
