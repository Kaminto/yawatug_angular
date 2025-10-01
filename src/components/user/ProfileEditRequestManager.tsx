
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ProfileEditRequestManagerProps {
  profile: any;
  onEditEnabled: () => void;
  onRequestStatusChange: () => void;
}

const ProfileEditRequestManager: React.FC<ProfileEditRequestManagerProps> = ({
  profile,
  onEditEnabled,
  onRequestStatusChange
}) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<string | null>(null);

  useEffect(() => {
    checkEditPermissions();
  }, [profile]);

  const checkEditPermissions = () => {
    if (!profile) return;

    // Allow editing if not verified, has edit approval, or admin
    if (!profile.is_verified || profile.edit_approved || profile.user_role === 'admin') {
      onEditEnabled();
      return;
    }

    setRequestStatus(profile.edit_request_status || null);
    setLastRequest(profile.last_edit_request || null);
  };

  const handleSubmitRequest = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for the edit request');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          edit_requested: true,
          edit_reason: reason,
          edit_request_status: 'pending',
          last_edit_request: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Edit request submitted successfully');
      setReason('');
      setRequestStatus('pending');
      setLastRequest(new Date().toISOString());
      onRequestStatusChange();
    } catch (error) {
      console.error('Error submitting edit request:', error);
      toast.error('Failed to submit edit request');
    } finally {
      setSubmitting(false);
    }
  };

  // Don't show if user can already edit
  if (!profile?.is_verified || profile?.edit_approved || profile?.user_role === 'admin') {
    return null;
  }

  // Show pending status
  if (requestStatus === 'pending') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            Edit Request Under Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your profile edit request is being reviewed by administrators. 
              Please wait for approval before submitting another request.
              {lastRequest && (
                <span className="block mt-1 text-sm text-muted-foreground">
                  Submitted: {new Date(lastRequest).toLocaleDateString()}
                </span>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Show approved status
  if (requestStatus === 'approved') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Edit Request Approved
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your edit request has been approved. You can now edit your profile.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Show rejected status and allow new request
  if (requestStatus === 'rejected') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Request Profile Edit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-red-50 border-red-200">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Your previous edit request was rejected. You can submit a new request with additional information.
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
            {submitting ? 'Submitting Request...' : 'Submit New Edit Request'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Default: Show request form for verified users
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

export default ProfileEditRequestManager;
