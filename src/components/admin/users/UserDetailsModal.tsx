import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, FileText } from 'lucide-react';

type UserStatus = 'active' | 'blocked' | 'unverified' | 'pending_verification';

interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  account_type: string;
  user_role: string;
  status: UserStatus;
  profile_picture_url?: string;
  nationality?: string;
  country_of_residence?: string;
  user_documents?: any[];
  gender?: string;
  date_of_birth?: string;
  address?: string;
  tin?: string;
  // removed user_type from everywhere
}

interface UserDetailsModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onApproveDocument: (documentId: string) => void;
  onRejectDocument: (documentId: string) => void;
}

const UserDetailsModal = ({
  user,
  isOpen,
  onClose,
  onApproveDocument,
  onRejectDocument
}: UserDetailsModalProps) => {
  const getStatusBadge = (status: UserStatus) => {
    const variants = {
      active: 'default',
      pending_verification: 'secondary',
      blocked: 'destructive',
      unverified: 'outline'
    } as const;

    const labels = {
      active: 'Verified',
      pending_verification: 'Pending',
      blocked: 'Blocked',
      unverified: 'Unverified'
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const getDocumentStatusBadge = (status: string) => {
    const variants = {
      approved: 'default',
      pending: 'secondary',
      rejected: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Details - {user.full_name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium mb-2">Personal Information</h5>
              <div className="space-y-2 text-sm">
                <p><strong>Name:</strong> {user.full_name}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Phone:</strong> {user.phone}</p>
                <p><strong>Gender:</strong> {user.gender || 'Not specified'}</p>
                <p><strong>Date of Birth:</strong> {user.date_of_birth || 'Not specified'}</p>
                <p><strong>TIN:</strong> {user.tin || 'Not provided'}</p>
              </div>
            </div>
            
            <div>
              <h5 className="font-medium mb-2">Location & Account</h5>
              <div className="space-y-2 text-sm">
                <p><strong>Nationality:</strong> {user.nationality}</p>
                <p><strong>Country:</strong> {user.country_of_residence}</p>
                <p><strong>Address:</strong> {user.address || 'Not provided'}</p>
                {/* Only show Account Type and User Role, never user_type */}
                <p><strong>Account Type:</strong> {user.account_type}</p>
                <p><strong>User Role:</strong> {user.user_role === "admin" ? "Admin" : "User"}</p>
                <p><strong>Status:</strong> {getStatusBadge(user.status)}</p>
              </div>
            </div>
          </div>
          
          <div>
            <h5 className="font-medium mb-2">Documents</h5>
            {user.user_documents && user.user_documents.length > 0 ? (
              <div className="space-y-2">
                {user.user_documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{doc.type.replace('_', ' ').toUpperCase()}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.document_number && `#${doc.document_number} • `}
                        Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getDocumentStatusBadge(doc.status)}
                      {doc.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => onApproveDocument(doc.id)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRejectDocument(doc.id)}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                      {doc.url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(doc.url, '_blank')}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No documents uploaded</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailsModal;
