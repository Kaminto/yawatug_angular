
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, Clock, XCircle, Send, AlertCircle } from 'lucide-react';

interface VerificationSubmissionFormProps {
  profile: any;
  documents: any[];
  onSubmissionComplete: () => void;
}

const VerificationSubmissionForm: React.FC<VerificationSubmissionFormProps> = ({
  profile,
  documents,
  onSubmissionComplete
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');

  const getCompletionChecks = () => {
    const requiredFields = ['full_name', 'email', 'phone', 'date_of_birth', 'nationality', 'country_of_residence', 'address'];
    const completedFields = requiredFields.filter(field => profile?.[field]);
    
    return {
      personalInfo: completedFields.length === requiredFields.length,
      profilePicture: !!profile?.profile_picture_url,
      documents: documents.length >= 2,
      emergencyContact: false // We'll need to get this from contacts
    };
  };

  const isReadyForVerification = () => {
    const checks = getCompletionChecks();
    return checks.personalInfo && checks.profilePicture && checks.documents;
  };

  const getCompletionPercentage = () => {
    const checks = getCompletionChecks();
    const completed = Object.values(checks).filter(Boolean).length;
    return Math.round((completed / Object.keys(checks).length) * 100);
  };

  const handleSubmitForVerification = async () => {
    if (!isReadyForVerification()) {
      toast.error('Please complete your profile and upload required documents before submitting for verification');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('Submitting profile for verification:', user.id);

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
      onSubmissionComplete();
    } catch (error) {
      console.error('Error submitting for verification:', error);
      toast.error('Failed to submit for verification');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'pending_verification':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending Verification</Badge>;
      case 'blocked':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Blocked</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unverified</Badge>;
    }
  };

  const checks = getCompletionChecks();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Verification Status
          {getStatusBadge(profile?.status || 'unverified')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Profile Completion</span>
            <span className="text-sm text-muted-foreground">{getCompletionPercentage()}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${getCompletionPercentage()}%` }}
            ></div>
          </div>
        </div>

        {(profile?.status === 'unverified' || !profile?.status) && (
          <>
            <div className="space-y-2">
              <h4 className="font-medium">Verification Requirements:</h4>
              <ul className="text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className={`h-4 w-4 ${checks.personalInfo ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={checks.personalInfo ? 'text-green-700' : 'text-gray-500'}>
                    Complete personal information
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className={`h-4 w-4 ${checks.profilePicture ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={checks.profilePicture ? 'text-green-700' : 'text-gray-500'}>
                    Upload profile picture
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className={`h-4 w-4 ${checks.documents ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={checks.documents ? 'text-green-700' : 'text-gray-500'}>
                    Upload at least 2 documents ({documents.length} uploaded)
                  </span>
                </li>
              </ul>
            </div>

            {!isReadyForVerification() && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Profile Incomplete</p>
                    <p className="text-sm text-yellow-700">
                      Please complete all requirements above before submitting for verification.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label>Additional Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information you'd like to provide..."
                className="mt-1"
              />
            </div>

            <Button 
              onClick={handleSubmitForVerification}
              disabled={!isReadyForVerification() || submitting}
              className="w-full"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit for Verification
                </>
              )}
            </Button>
          </>
        )}

        {profile?.status === 'pending_verification' && (
          <div className="text-center py-4">
            <Clock className="h-12 w-12 mx-auto text-yellow-500 mb-2" />
            <h4 className="font-medium">Verification in Progress</h4>
            <p className="text-sm text-muted-foreground">
              Your profile is currently being reviewed by our team. This usually takes 1-3 business days.
            </p>
          </div>
        )}

        {profile?.status === 'active' && (
          <div className="text-center py-4">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
            <h4 className="font-medium">Profile Verified</h4>
            <p className="text-sm text-muted-foreground">
              Your profile has been successfully verified. You can now access all platform features.
            </p>
          </div>
        )}

        {profile?.status === 'blocked' && (
          <div className="text-center py-4">
            <XCircle className="h-12 w-12 mx-auto text-red-500 mb-2" />
            <h4 className="font-medium">Profile Blocked</h4>
            <p className="text-sm text-muted-foreground">
              Your profile has been blocked. Please contact support for assistance.
            </p>
          </div>
        )}

        {profile?.verification_notes && profile?.status === 'unverified' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Admin Feedback</p>
                <p className="text-sm text-red-700">{profile.verification_notes}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VerificationSubmissionForm;
