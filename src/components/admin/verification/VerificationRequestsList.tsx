
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarDays, Eye, FileText, AlertCircle } from 'lucide-react';

interface VerificationRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'needs_resubmission';
  submitted_at: string;
  documents_complete: boolean;
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
    status: string;
  }>;
}

interface VerificationRequestsListProps {
  requests: VerificationRequest[];
  onViewDetails: (request: VerificationRequest) => void;
  title: string;
}

const VerificationRequestsList: React.FC<VerificationRequestsListProps> = ({
  requests,
  onViewDetails,
  title
}) => {
  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      in_review: 'default',
      approved: 'default',
      rejected: 'destructive',
      needs_resubmission: 'outline'
    } as const;

    const labels = {
      pending: 'Pending',
      in_review: 'In Review',
      approved: 'Approved',
      rejected: 'Rejected',
      needs_resubmission: 'Needs Resubmission'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDocumentStats = (documents: Array<{ status: string }>) => {
    const pending = documents.filter(doc => doc.status === 'pending').length;
    const approved = documents.filter(doc => doc.status === 'approved').length;
    const rejected = documents.filter(doc => doc.status === 'rejected').length;
    
    return { pending, approved, rejected, total: documents.length };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          <Badge variant="outline">{requests.length} requests</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">No verification requests found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const docStats = getDocumentStats(request.user_documents);
              return (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-4 flex-1">
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
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{request.user_profile.full_name}</p>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-sm text-gray-500">{request.user_profile.email}</p>
                      <p className="text-sm text-gray-500">
                        Account Type: {request.user_profile.account_type}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <CalendarDays className="h-3 w-3" />
                        <span>Submitted: {formatDate(request.submitted_at)}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm mb-1">
                        <span className="font-medium">Documents: </span>
                        <span className="text-green-600">{docStats.approved}</span>
                        <span className="text-gray-400"> / </span>
                        <span className="text-yellow-600">{docStats.pending}</span>
                        <span className="text-gray-400"> / </span>
                        <span className="text-red-600">{docStats.rejected}</span>
                        <span className="text-gray-400"> of {docStats.total}</span>
                      </div>
                      {!request.documents_complete && (
                        <div className="flex items-center gap-1 text-xs text-yellow-600">
                          <AlertCircle className="h-3 w-3" />
                          <span>Incomplete</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(request)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Review
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

export default VerificationRequestsList;
