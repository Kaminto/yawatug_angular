
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Eye, User, FileText, Phone } from 'lucide-react';
import type { DocumentStatus } from '@/types/documents';

interface UserForVerification {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  account_type: string;
  created_at: string;
  verification_submitted_at: string;
  profile_completion_percentage: number;
}

interface UserDocument {
  id: string;
  type: string;
  url: string;
  status: DocumentStatus;
  uploaded_at: string;
  document_number?: string;
  feedback?: string;
}

const AdminUserVerificationPage = () => {
  const [pendingUsers, setPendingUsers] = useState<UserForVerification[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserForVerification | null>(null);
  const [userDocuments, setUserDocuments] = useState<UserDocument[]>([]);
  const [contactPersons, setContactPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'pending_verification')
        .order('verification_submitted_at', { ascending: true });

      if (error) throw error;
      setPendingUsers(data || []);
    } catch (error) {
      console.error('Error loading pending users:', error);
      toast.error('Failed to load pending users');
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetails = async (userId: string) => {
    try {
      // Load documents
      const { data: docs, error: docsError } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', userId);

      if (docsError) throw docsError;
      setUserDocuments(docs || []);

      // Load contact persons
      const { data: contacts, error: contactsError } = await supabase
        .from('contact_persons')
        .select('*')
        .eq('user_id', userId);

      if (contactsError) throw contactsError;
      setContactPersons(contacts || []);
    } catch (error) {
      console.error('Error loading user details:', error);
      toast.error('Failed to load user details');
    }
  };

  const handleSelectUser = (user: UserForVerification) => {
    setSelectedUser(user);
    loadUserDetails(user.id);
  };

  const handleApproveUser = async () => {
    if (!selectedUser) return;

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          status: 'active',
          verification_reviewed_by: user.id,
          verification_reviewed_at: new Date().toISOString(),
          verification_notes: feedback || 'Profile approved'
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success('User approved successfully');
      setSelectedUser(null);
      setFeedback('');
      loadPendingUsers();
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to approve user');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectUser = async () => {
    if (!selectedUser || !feedback.trim()) {
      toast.error('Please provide feedback for rejection');
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          status: 'unverified',
          verification_reviewed_by: user.id,
          verification_reviewed_at: new Date().toISOString(),
          verification_notes: feedback
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success('User rejected with feedback');
      setSelectedUser(null);
      setFeedback('');
      loadPendingUsers();
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error('Failed to reject user');
    } finally {
      setProcessing(false);
    }
  };

  const handleDocumentAction = async (documentId: string, action: DocumentStatus, docFeedback?: string) => {
    try {
      const { error } = await supabase
        .from('user_documents')
        .update({
          status: action,
          feedback: docFeedback || undefined
        })
        .eq('id', documentId);

      if (error) throw error;

      toast.success(`Document ${action} successfully`);
      if (selectedUser) {
        loadUserDetails(selectedUser.id);
      }
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error('Failed to update document');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_verification':
        return <Badge variant="secondary">Pending Review</Badge>;
      case 'active':
        return <Badge variant="default">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDocumentStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading verification requests...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Pending Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Verification ({pendingUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingUsers.map((user) => (
              <div
                key={user.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedUser?.id === user.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                }`}
                onClick={() => handleSelectUser(user)}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{user.full_name}</p>
                  {getStatusBadge(user.status)}
                </div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="text-sm text-muted-foreground">{user.phone}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground capitalize">{user.account_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.profile_completion_percentage}% complete
                  </p>
                </div>
              </div>
            ))}

            {pendingUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No pending verification requests
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Details */}
      {selectedUser && (
        <div className="lg:col-span-2 space-y-6">
          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Full Name</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.full_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.phone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Account Type</p>
                  <p className="text-sm text-muted-foreground capitalize">{selectedUser.account_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Submitted</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedUser.verification_submitted_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Completion</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.profile_completion_percentage}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents ({userDocuments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium capitalize">{doc.type.replace('_', ' ')}</p>
                        {getDocumentStatusBadge(doc.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                      </p>
                      {doc.document_number && (
                        <p className="text-sm text-muted-foreground">#{doc.document_number}</p>
                      )}
                      {doc.feedback && (
                        <p className="text-sm text-red-600 mt-1">{doc.feedback}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(doc.url, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {doc.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDocumentAction(doc.id, 'approved')}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const feedback = prompt('Reason for rejection:');
                              if (feedback) handleDocumentAction(doc.id, 'rejected', feedback);
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {userDocuments.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    No documents uploaded
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Persons */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Persons ({contactPersons.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {contactPersons.map((contact) => (
                  <div key={contact.id} className="p-3 border rounded-lg">
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">{contact.phone}</p>
                    {contact.email && (
                      <p className="text-sm text-muted-foreground">{contact.email}</p>
                    )}
                    <p className="text-sm capitalize">{contact.relationship}</p>
                  </div>
                ))}

                {contactPersons.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    No contact persons added
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Admin Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Admin Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Feedback/Notes</label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Add notes or feedback for the user..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleApproveUser}
                  disabled={processing}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {processing ? 'Processing...' : 'Approve User'}
                </Button>

                <Button
                  variant="destructive"
                  onClick={handleRejectUser}
                  disabled={processing || !feedback.trim()}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {processing ? 'Processing...' : 'Reject User'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!selectedUser && (
        <div className="lg:col-span-2 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a user from the list to review their verification request</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserVerificationPage;
