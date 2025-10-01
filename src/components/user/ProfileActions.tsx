
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, Edit, CheckCircle } from 'lucide-react';

interface ProfileActionsProps {
  profile: any;
  onActionComplete: () => void;
}

const ProfileActions: React.FC<ProfileActionsProps> = ({ profile, onActionComplete }) => {
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showEditRequestDialog, setShowEditRequestDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editReason, setEditReason] = useState('');

  const canSubmitForVerification = () => {
    return profile?.status === 'unverified' || !profile?.status;
  };

  const canRequestEdit = () => {
    return profile?.status === 'active' || profile?.status === 'pending_verification';
  };

  const handleSubmitForVerification = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          status: 'pending_verification',
          verification_submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile submitted for verification successfully!');
      setShowSubmitDialog(false);
      onActionComplete();
    } catch (error) {
      console.error('Error submitting for verification:', error);
      toast.error('Failed to submit for verification');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestEdit = async () => {
    if (!editReason.trim()) {
      toast.error('Please provide a reason for the edit request');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          edit_requested: true,
          edit_request_status: 'pending',
          edit_reason: editReason,
          last_edit_request: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Edit request submitted successfully!');
      setShowEditRequestDialog(false);
      setEditReason('');
      onActionComplete();
    } catch (error) {
      console.error('Error submitting edit request:', error);
      toast.error('Failed to submit edit request');
    } finally {
      setLoading(false);
    }
  };

  if (profile?.status === 'pending_verification') {
    return (
      <div className="flex items-center gap-2 text-yellow-600">
        <CheckCircle className="h-4 w-4" />
        <span className="font-medium">Your profile is under review</span>
      </div>
    );
  }

  if (profile?.status === 'active' && profile?.edit_requested) {
    return (
      <div className="flex items-center gap-2 text-blue-600">
        <Edit className="h-4 w-4" />
        <span className="font-medium">Edit request pending admin approval</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-2">
        {canSubmitForVerification() && (
          <Button onClick={() => setShowSubmitDialog(true)}>
            <Send className="h-4 w-4 mr-2" />
            Submit for Verification
          </Button>
        )}

        {canRequestEdit() && !profile?.edit_requested && (
          <Button variant="outline" onClick={() => setShowEditRequestDialog(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Request Edit Permission
          </Button>
        )}
      </div>

      {/* Submit for Verification Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Profile for Verification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your profile will be reviewed by our team. This usually takes 1-3 business days.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleSubmitForVerification} disabled={loading}>
                {loading ? 'Submitting...' : 'Submit'}
              </Button>
              <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Request Dialog */}
      <Dialog open={showEditRequestDialog} onOpenChange={setShowEditRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Edit Permission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-reason">Reason for Edit Request</Label>
              <Textarea
                id="edit-reason"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Please explain why you need to edit your profile..."
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleRequestEdit} disabled={loading || !editReason.trim()}>
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
              <Button variant="outline" onClick={() => setShowEditRequestDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfileActions;
