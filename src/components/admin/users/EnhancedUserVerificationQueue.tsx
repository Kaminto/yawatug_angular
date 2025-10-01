
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarDays, Eye, AlertTriangle, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import EnhancedVerificationReviewModal from './EnhancedVerificationReviewModal';

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
  user_documents?: any[];
  contact_persons?: any[];
  gender?: string;
  date_of_birth?: string;
  address?: string;
  tin?: string;
  updated_at: string;
}

const EnhancedUserVerificationQueue = () => {
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingVerifications();
    
    // Set up subscription for real-time updates
    const subscription = supabase
      .channel('profiles_verification_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'profiles',
          filter: 'status=eq.pending_verification'
        }, 
        () => loadPendingVerifications()
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadPendingVerifications = async () => {
    try {
      setLoading(true);
      
      // Load users with their documents and contacts
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select(`
          *,
          user_documents (*),
          contact_persons (*)
        `)
        .eq('status', 'pending_verification')
        .order('updated_at', { ascending: false });
      
      if (usersError) throw usersError;
      
      console.log('Loaded pending verification users with documents:', users?.length || 0);
      setPendingUsers(users || []);
    } catch (error: any) {
      console.error("Error fetching verification queue:", error);
      toast.error('Failed to load verification queue');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewUser = (user: User) => {
    console.log('Opening review modal for user:', user.id, 'Documents:', user.user_documents?.length);
    setSelectedUser(user);
    setShowReviewModal(true);
  };

  const handleStatusUpdate = (userId: string, status: string, notes?: string) => {
    console.log('User status updated:', userId, status);
    // Remove from queue immediately and refresh
    setPendingUsers(prev => prev.filter(user => user.id !== userId));
    loadPendingVerifications();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getProfileCompleteness = (user: User) => {
    const requiredFields = ['full_name', 'phone', 'date_of_birth', 'nationality', 'address', 'account_type'];
    const completedFields = requiredFields.filter(field => user[field as keyof User]);
    const profileScore = (completedFields.length / requiredFields.length) * 40;
    
    // Profile picture score
    const pictureScore = user.profile_picture_url ? 20 : 0;
    
    // Documents score (at least 2 required documents)
    const documentsCount = user.user_documents?.length || 0;
    const documentScore = Math.min(documentsCount / 2, 1) * 20;
    
    // Emergency contacts score (at least 1 required)
    const contactsCount = user.contact_persons?.length || 0;
    const contactScore = contactsCount > 0 ? 20 : 0;
    
    return Math.round(profileScore + pictureScore + documentScore + contactScore);
  };

  const hasIssues = (user: User) => {
    return !user.full_name || !user.phone || !user.date_of_birth || !user.nationality || !user.address || !user.account_type;
  };

  const getDocumentStats = (user: User) => {
    const documents = user.user_documents || [];
    const approved = documents.filter(doc => doc.status === 'approved').length;
    const pending = documents.filter(doc => doc.status === 'pending').length;
    const rejected = documents.filter(doc => doc.status === 'rejected').length;
    
    return { total: documents.length, approved, pending, rejected };
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
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Enhanced Verification Queue</CardTitle>
          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
            {pendingUsers.length} Pending
          </Badge>
        </CardHeader>
        <CardContent>
          {pendingUsers.length === 0 ? (
            <div className="text-center py-8">
              <div className="h-12 w-12 mx-auto text-green-500 mb-2">✓</div>
              <p className="text-gray-500 dark:text-gray-400">No pending verifications</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingUsers.map((user) => {
                const completeness = getProfileCompleteness(user);
                const hasProfileIssues = hasIssues(user);
                const docStats = getDocumentStats(user);
                const contactsCount = user.contact_persons?.length || 0;
                
                return (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      hasProfileIssues ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar>
                        {user.profile_picture_url ? (
                          <AvatarImage src={user.profile_picture_url} alt={user.full_name || ""} />
                        ) : (
                          <AvatarFallback>
                            {(user.full_name || "").substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{user.full_name || "No Name"}</p>
                          {hasProfileIssues && (
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                          <div className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            <span>Submitted: {formatDate(user.updated_at)}</span>
                          </div>
                          <span>•</span>
                          <span>Profile: {completeness}% complete</span>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            <span>{docStats.total} docs</span>
                          </div>
                          <span>•</span>
                          <span>{contactsCount} contacts</span>
                        </div>
                        
                        {/* Document status badges */}
                        <div className="flex items-center gap-2 mt-2">
                          {docStats.approved > 0 && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                              {docStats.approved} Approved
                            </Badge>
                          )}
                          {docStats.pending > 0 && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 text-xs">
                              {docStats.pending} Pending
                            </Badge>
                          )}
                          {docStats.rejected > 0 && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">
                              {docStats.rejected} Rejected
                            </Badge>
                          )}
                        </div>
                        
                        {hasProfileIssues && (
                          <div className="text-xs text-yellow-600 mt-1">
                            Profile requires attention - missing required fields
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReviewUser(user)}
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

      <EnhancedVerificationReviewModal
        user={selectedUser}
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setSelectedUser(null);
        }}
        onStatusUpdate={handleStatusUpdate}
        onRefresh={loadPendingVerifications}
      />
    </>
  );
};

export default EnhancedUserVerificationQueue;
