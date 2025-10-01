import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, FileText, Eye, Clock, AlertTriangle, User, Phone, MapPin, Calendar, Save, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  account_type: string;
  user_role: string;
  status: string;
  created_at: string;
  profile_picture_url?: string;
  nationality?: string;
  country_of_residence?: string;
  gender?: string;
  date_of_birth?: string;
  address?: string;
  tin?: string;
  updated_at: string;
  user_documents?: any[];
  contact_persons?: any[];
}

interface Document {
  id: string;
  type: string;
  url: string;
  status: string;
  document_number?: string;
  uploaded_at: string;
  feedback?: string;
}

interface ContactPerson {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship: string;
}

interface EnhancedVerificationReviewModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (userId: string, status: string, notes?: string) => void;
  onRefresh: () => void;
}

const EnhancedVerificationReviewModal: React.FC<EnhancedVerificationReviewModalProps> = ({
  user,
  isOpen,
  onClose,
  onStatusUpdate,
  onRefresh
}) => {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [contactPersons, setContactPersons] = useState<ContactPerson[]>([]);
  const [editableUser, setEditableUser] = useState<User | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [documentFeedback, setDocumentFeedback] = useState<Record<string, string>>({});
  const [viewingDocument, setViewingDocument] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      console.log('Modal opened with user:', user.id, 'Loading fresh data...');
      setEditableUser({ ...user });
      loadUserData();
      setAdminNotes('');
      setRejectionReason('');
      setDocumentFeedback({});
      setHasUnsavedChanges(false);
    }
  }, [user, isOpen]);

  const loadUserData = async () => {
    if (!user) return;
    
    console.log('Loading complete user data for:', user.id);
    setLoading(true);
    
    try {
      // Load user documents - using the EXACT same query structure as Profile.tsx
      console.log('Fetching documents from user_documents table for user:', user.id);
      const { data: documentsData, error: documentsError } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (documentsError) {
        console.error('Error loading documents from user_documents table:', documentsError);
        toast.error('Failed to load documents');
        setDocuments([]);
      } else {
        console.log(`Successfully loaded ${documentsData?.length || 0} documents from user_documents:`, documentsData);
        setDocuments(documentsData || []);
      }

      // Load contact persons - using the EXACT same query structure as Profile.tsx
      console.log('Fetching contacts from contact_persons table for user:', user.id);
      const { data: contactsData, error: contactsError } = await supabase
        .from('contact_persons')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (contactsError) {
        console.error('Error loading contacts from contact_persons table:', contactsError);
        toast.error('Failed to load contacts');
        setContactPersons([]);
      } else {
        console.log(`Successfully loaded ${contactsData?.length || 0} contacts from contact_persons:`, contactsData);
        setContactPersons(contactsData || []);
      }

      // Also refresh the user profile data from profiles table
      console.log('Refreshing profile data from profiles table for user:', user.id);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error refreshing profile from profiles table:', profileError);
      } else {
        console.log('Refreshed profile data from profiles table:', profileData);
        setEditableUser(profileData);
      }
      
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async () => {
    setRefreshing(true);
    console.log('Manual refresh triggered for user:', user?.id);
    await loadUserData();
    setRefreshing(false);
    toast.success('User data refreshed');
  };

  const handleUserFieldChange = (field: string, value: string) => {
    if (!editableUser) return;
    
    setEditableUser(prev => prev ? { ...prev, [field]: value } : null);
    setHasUnsavedChanges(true);
  };

  const handleSaveUserChanges = async () => {
    if (!editableUser) return;
    
    setLoading(true);
    try {
      console.log('Saving user changes to profiles table for user:', editableUser.id);
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editableUser.full_name,
          phone: editableUser.phone,
          nationality: editableUser.nationality,
          country_of_residence: editableUser.country_of_residence,
          address: editableUser.address,
          gender: editableUser.gender,
          date_of_birth: editableUser.date_of_birth,
          tin: editableUser.tin,
          account_type: editableUser.account_type,
          updated_at: new Date().toISOString()
        })
        .eq('id', editableUser.id);

      if (error) throw error;

      await logAdminAction('update_profile', undefined, 'Profile updated by admin');
      
      toast.success('User profile updated successfully');
      setHasUnsavedChanges(false);
      onRefresh();
    } catch (error) {
      console.error('Error saving user changes to profiles table:', error);
      toast.error('Failed to save user changes');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDocument = async (documentId: string) => {
    try {
      setLoading(true);
      console.log('Approving document in user_documents table:', documentId);
      
      const { error } = await supabase
        .from('user_documents')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (error) throw error;

      await logAdminAction('approve_document', documentId, 'Document approved');
      
      toast.success('Document approved');
      loadUserData();
    } catch (error) {
      console.error('Error approving document in user_documents table:', error);
      toast.error('Failed to approve document');
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
      console.log('Rejecting document in user_documents table:', documentId, 'with feedback:', feedback);
      
      const { error } = await supabase
        .from('user_documents')
        .update({ 
          status: 'rejected',
          feedback: feedback,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (error) throw error;

      await logAdminAction('reject_document', documentId, feedback);
      
      toast.success('Document rejected');
      setDocumentFeedback(prev => ({ ...prev, [documentId]: '' }));
      loadUserData();
    } catch (error) {
      console.error('Error rejecting document in user_documents table:', error);
      toast.error('Failed to reject document');
    } finally {
      setLoading(false);
    }
  };

  const logAdminAction = async (actionType: string, targetDocumentId?: string, notes?: string) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser || !user) return;

      const { error } = await supabase
        .from('admin_verification_actions')
        .insert({
          admin_id: currentUser.id,
          user_id: user.id,
          action_type: actionType,
          target_document_id: targetDocumentId,
          notes: notes
        });

      if (error) {
        console.error('Error logging admin action:', error);
      }
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  };

  const handleApproveProfile = async () => {
    if (!user) return;
    
    // Check if user has minimum requirements
    const hasRequiredDocs = documents.length >= 1 && documents.some(doc => doc.status === 'approved');
    const hasRequiredInfo = editableUser?.full_name && editableUser?.phone && editableUser?.date_of_birth;
    
    if (!hasRequiredDocs || !hasRequiredInfo) {
      toast.error('User must have approved documents and complete profile information before approval');
      return;
    }
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: 'active',
          is_verified: true,
          verification_reviewed_at: new Date().toISOString(),
          verification_notes: adminNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      await logAdminAction('approve_profile', undefined, adminNotes);
      
      onStatusUpdate(user.id, 'active', adminNotes);
      toast.success('Profile approved successfully');
      onClose();
    } catch (error) {
      console.error('Error approving profile:', error);
      toast.error('Failed to approve profile');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectProfile = async () => {
    if (!user) return;
    
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: 'unverified',
          is_verified: false,
          verification_reviewed_at: new Date().toISOString(),
          verification_notes: rejectionReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      await logAdminAction('reject_profile', undefined, rejectionReason);
      
      onStatusUpdate(user.id, 'unverified', rejectionReason);
      toast.success('Profile rejected');
      onClose();
    } catch (error) {
      console.error('Error rejecting profile:', error);
      toast.error('Failed to reject profile');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResubmission = async () => {
    if (!user) return;
    
    if (!rejectionReason.trim()) {
      toast.error('Please provide instructions for resubmission');
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: 'unverified',
          verification_notes: rejectionReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      await logAdminAction('request_resubmission', undefined, rejectionReason);
      
      onStatusUpdate(user.id, 'unverified', rejectionReason);
      toast.success('Resubmission requested');
      onClose();
    } catch (error) {
      console.error('Error requesting resubmission:', error);
      toast.error('Failed to request resubmission');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const formatDocumentType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getProfileCompleteness = () => {
    if (!editableUser) return 0;
    
    const requiredFields = ['full_name', 'phone', 'date_of_birth', 'nationality', 'address', 'account_type'];
    const completedFields = requiredFields.filter(field => editableUser[field as keyof User]);
    const profileScore = (completedFields.length / requiredFields.length) * 40;
    
    const pictureScore = editableUser.profile_picture_url ? 20 : 0;
    const documentScore = Math.min(documents.length / 2, 1) * 20;
    const contactScore = contactPersons.length > 0 ? 20 : 0;
    
    return Math.round(profileScore + pictureScore + documentScore + contactScore);
  };

  const hasCompletionIssues = () => {
    if (!editableUser) return true;
    return !editableUser.full_name || !editableUser.phone || !editableUser.date_of_birth || 
           !editableUser.nationality || !editableUser.address || 
           documents.length < 2 || contactPersons.length === 0;
  };

  if (!user) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar>
                {user.profile_picture_url ? (
                  <AvatarImage 
                    src={user.profile_picture_url} 
                    alt={user.full_name} 
                  />
                ) : (
                  <AvatarFallback>
                    {user.full_name?.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>Enhanced Verification Review - {user.full_name}</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshUserData}
                    disabled={refreshing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
                <div className="text-sm font-normal text-gray-500">
                  Status: {user.status} • Documents: {documents.length} • Contacts: {contactPersons.length} • 
                  Completeness: {getProfileCompleteness()}%
                  {hasCompletionIssues() && (
                    <span className="ml-2 text-orange-600 font-medium">⚠️ Issues Found</span>
                  )}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">Profile Edit</TabsTrigger>
              <TabsTrigger value="documents">
                Documents ({documents.length})
                {documents.some(doc => doc.status === 'pending') && (
                  <span className="ml-1 h-2 w-2 bg-yellow-500 rounded-full inline-block"></span>
                )}
              </TabsTrigger>
              <TabsTrigger value="contacts">Contacts ({contactPersons.length})</TabsTrigger>
              <TabsTrigger value="actions">Admin Actions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="space-y-4">
              {editableUser && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={editableUser.full_name || ''}
                        onChange={(e) => handleUserFieldChange('full_name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={editableUser.email || ''}
                        disabled
                        className="bg-gray-100"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={editableUser.phone || ''}
                        onChange={(e) => handleUserFieldChange('phone', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="nationality">Nationality</Label>
                      <Input
                        id="nationality"
                        value={editableUser.nationality || ''}
                        onChange={(e) => handleUserFieldChange('nationality', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="country_of_residence">Country of Residence</Label>
                      <Input
                        id="country_of_residence"
                        value={editableUser.country_of_residence || ''}
                        onChange={(e) => handleUserFieldChange('country_of_residence', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="gender">Gender</Label>
                      <Select value={editableUser.gender || ''} onValueChange={(value) => handleUserFieldChange('gender', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="date_of_birth">Date of Birth</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={editableUser.date_of_birth || ''}
                        onChange={(e) => handleUserFieldChange('date_of_birth', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        value={editableUser.address || ''}
                        onChange={(e) => handleUserFieldChange('address', e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="tin">TIN</Label>
                      <Input
                        id="tin"
                        value={editableUser.tin || ''}
                        onChange={(e) => handleUserFieldChange('tin', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="account_type">Account Type</Label>
                      <Select value={editableUser.account_type || ''} onValueChange={(value) => handleUserFieldChange('account_type', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">Individual</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="organization">Organization</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
              
              {hasUnsavedChanges && (
                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleSaveUserChanges} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="documents" className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-700">
                  <strong>Documents Status:</strong> Found {documents.length} document(s) in user_documents table for this user.
                </p>
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="h-8 w-8 border-4 border-yawatu-gold border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading documents from user_documents table...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">No documents found in user_documents table</p>
                  <p className="text-sm text-orange-600 mt-2">
                    ⚠️ User needs to upload required documents for verification
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h5 className="font-medium">{formatDocumentType(doc.type)}</h5>
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
                        <div className="space-y-2 mt-3">
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
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectDocument(doc.id)}
                              disabled={loading || !documentFeedback[doc.id]?.trim()}
                              className="border-red-300 text-red-700 hover:bg-red-50"
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

            <TabsContent value="contacts" className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-700">
                  <strong>Emergency Contacts:</strong> Found {contactPersons.length} contact(s) in contact_persons table for this user.
                </p>
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="h-8 w-8 border-4 border-yawatu-gold border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading contacts from contact_persons table...</p>
                </div>
              ) : contactPersons.length === 0 ? (
                <div className="text-center py-8">
                  <Phone className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">No emergency contacts found in contact_persons table</p>
                  <p className="text-sm text-orange-600 mt-2">
                    ⚠️ At least one emergency contact is required for verification
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {contactPersons.map((contact) => (
                    <div key={contact.id} className="border rounded-lg p-4 bg-white">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {contact.name}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Relationship: {contact.relationship}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {contact.phone}
                          </p>
                          {contact.email && (
                            <p className="text-sm mt-1">
                              Email: {contact.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="actions" className="space-y-4">
              <div className="space-y-4">
                {hasCompletionIssues() && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-800 font-medium mb-2">
                      <AlertTriangle className="h-5 w-5" />
                      Profile Incomplete
                    </div>
                    <p className="text-sm text-orange-700">
                      This user's profile is incomplete. Missing: {
                        [
                          !editableUser?.full_name && 'Full Name',
                          !editableUser?.phone && 'Phone',
                          !editableUser?.date_of_birth && 'Date of Birth',
                          !editableUser?.nationality && 'Nationality',
                          !editableUser?.address && 'Address',
                          documents.length === 0 && 'Documents'
                        ].filter(Boolean).join(', ')
                      }
                    </p>
                  </div>
                )}
                
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
                
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={handleApproveProfile}
                    disabled={loading || hasCompletionIssues()}
                    className="bg-green-600 hover:bg-green-700"
                    title={hasCompletionIssues() ? 'Complete profile and documents required for approval' : ''}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {loading ? 'Processing...' : 'Approve Profile'}
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
        </DialogContent>
      </Dialog>

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
                onError={(e) => {
                  console.error('Failed to load document image:', viewingDocument);
                  toast.error('Failed to load document image');
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default EnhancedVerificationReviewModal;
