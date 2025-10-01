
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';

interface ProfileEditRequestProps {
  userId: string;
  isVerified: boolean;
  editRequestStatus?: string;
  lastEditRequest?: string;
  onStatusChange?: () => void;
}

const ProfileEditRequest: React.FC<ProfileEditRequestProps> = ({ 
  userId, 
  isVerified, 
  editRequestStatus,
  lastEditRequest,
  onStatusChange
}) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitRequest = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for the edit request');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          edit_requested: true,
          edit_reason: reason,
          edit_request_status: 'pending',
          last_edit_request: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Edit request submitted successfully');
      setReason('');
      onStatusChange?.();
    } catch (error) {
      console.error('Error submitting edit request:', error);
      toast.error('Failed to submit edit request');
    } finally {
      setSubmitting(false);
    }
  };

  // Only show for verified users
  if (!isVerified) {
    return null;
  }

  // Show status if there's a pending request
  if (editRequestStatus === 'pending') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            Edit Request Under Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your profile edit request is being reviewed by administrators. 
              Please wait for approval before submitting another request.
              {lastEditRequest && (
                <span className="block mt-1 text-sm text-muted-foreground">
                  Submitted on: {new Date(lastEditRequest).toLocaleDateString()}
                </span>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Show approved status
  if (editRequestStatus === 'approved') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Edit Request Approved
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your edit request has been approved. You can now edit your profile.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Show rejected status
  if (editRequestStatus === 'rejected') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Edit Request Rejected
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Your edit request was rejected. You can submit a new request with additional information.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Profile Edit</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Since your profile is verified, you need admin approval to make changes. 
            Please explain why you need to edit your profile.
          </AlertDescription>
        </Alert>

        <div>
          <Label htmlFor="editReason">Reason for Edit Request</Label>
          <Textarea
            id="editReason"
            placeholder="Please explain why you need to edit your verified profile..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>

        <Button 
          onClick={handleSubmitRequest} 
          disabled={submitting || !reason.trim()}
          className="w-full"
        >
          {submitting ? 'Submitting Request...' : 'Submit Edit Request'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProfileEditRequest;
