
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, XCircle, AlertTriangle, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProfileEditRequestFlowProps {
  currentStatus: string;
  editRequested: boolean;
  editApproved: boolean;
  editReason?: string;
  onStatusUpdate: () => void;
}

const ProfileEditRequestFlow: React.FC<ProfileEditRequestFlowProps> = ({
  currentStatus,
  editRequested,
  editApproved,
  editReason,
  onStatusUpdate
}) => {
  const [requestReason, setRequestReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getStatusInfo = () => {
    if (!editRequested) {
      return {
        status: 'not_requested',
        color: 'gray',
        icon: AlertTriangle,
        message: 'You can request permission to edit your profile',
        progress: 0
      };
    }

    if (editRequested && currentStatus === 'pending') {
      return {
        status: 'pending',
        color: 'yellow',
        icon: Clock,
        message: 'Your edit request is being reviewed by administrators',
        progress: 50
      };
    }

    if (editApproved) {
      return {
        status: 'approved',
        color: 'green',
        icon: CheckCircle,
        message: 'Your edit request has been approved. You can now modify your profile',
        progress: 100
      };
    }

    return {
      status: 'rejected',
      color: 'red',
      icon: XCircle,
      message: 'Your edit request was not approved. Please see the reason below',
      progress: 25
    };
  };

  const handleSubmitRequest = async () => {
    if (!requestReason.trim()) {
      toast.error('Please provide a reason for your edit request');
      return;
    }

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          edit_requested: true,
          edit_request_status: 'pending',
          edit_reason: requestReason,
          last_edit_request: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Edit request submitted successfully');
      onStatusUpdate();
      setRequestReason('');
    } catch (error) {
      console.error('Error submitting edit request:', error);
      toast.error('Failed to submit edit request');
    } finally {
      setSubmitting(false);
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StatusIcon className={`h-5 w-5 text-${statusInfo.color}-500`} />
          Profile Edit Request Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Request Progress</span>
            <span>{statusInfo.progress}%</span>
          </div>
          <Progress value={statusInfo.progress} className="h-2" />
        </div>

        {/* Status Alert */}
        <Alert>
          <StatusIcon className="h-4 w-4" />
          <AlertDescription>{statusInfo.message}</AlertDescription>
        </Alert>

        {/* Current Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Current Status:</span>
          <Badge 
            variant={statusInfo.status === 'approved' ? 'default' : 
                   statusInfo.status === 'rejected' ? 'destructive' : 'secondary'}
          >
            {statusInfo.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        {/* Admin Feedback */}
        {editReason && statusInfo.status === 'rejected' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-medium text-red-800 mb-1">Administrator Feedback:</h4>
            <p className="text-sm text-red-700">{editReason}</p>
          </div>
        )}

        {/* Request Form */}
        {(!editRequested || statusInfo.status === 'rejected') && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="requestReason">Reason for Edit Request</Label>
              <Textarea
                id="requestReason"
                placeholder="Please explain why you need to edit your profile (e.g., outdated information, name change, address update, etc.)"
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                rows={4}
              />
            </div>
            <Button 
              onClick={handleSubmitRequest} 
              disabled={submitting || !requestReason.trim()}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {submitting ? 'Submitting...' : 'Submit Edit Request'}
            </Button>
          </div>
        )}

        {/* Guidelines */}
        <div className="text-xs text-gray-600 space-y-1">
          <p><strong>Guidelines:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Provide a clear reason for your profile changes</li>
            <li>Requests are typically reviewed within 24-48 hours</li>
            <li>Once approved, you'll have limited time to make changes</li>
            <li>Frequent edit requests may require additional verification</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileEditRequestFlow;
