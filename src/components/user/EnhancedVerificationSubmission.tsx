
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, Clock, XCircle, Send, AlertTriangle } from 'lucide-react';

interface EnhancedVerificationSubmissionProps {
  profile: any;
  documents: any[];
  onSubmissionComplete: () => void;
}

const EnhancedVerificationSubmission: React.FC<EnhancedVerificationSubmissionProps> = ({
  profile,
  documents,
  onSubmissionComplete
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');

  const getRequiredDocuments = () => {
    if (profile?.user_type === 'organisation' || profile?.user_type === 'business') {
      return ['business_registration', 'trading_license', 'proof_of_address'];
    }
    
    const base = ['national_id', 'proof_of_address'];
    const age = profile?.date_of_birth ? 
      Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
    
    if (age !== null && age < 18) {
      base.push('guardian_consent');
    }
    
    return base;
  };

  const getCompletionStatus = () => {
    const requiredFields = ['full_name', 'email', 'phone', 'date_of_birth', 'nationality', 'country_of_residence'];
    const completedFields = requiredFields.filter(field => profile?.[field]);
    const requiredDocs = getRequiredDocuments();
    const uploadedDocs = documents.filter(doc => requiredDocs.includes(doc.type));
    
    const profileCompletion = (completedFields.length / requiredFields.length) * 50;
    const documentsCompletion = Math.min(uploadedDocs.length / requiredDocs.length, 1) * 50;
    
    return {
      percentage: Math.round(profileCompletion + documentsCompletion),
      profileComplete: completedFields.length === requiredFields.length,
      documentsComplete: uploadedDocs.length >= requiredDocs.length,
      hasProfilePicture: !!profile?.profile_picture_url,
      missingFields: requiredFields.filter(field => !profile?.[field]),
      missingDocs: requiredDocs.filter(type => !documents.some(doc => doc.type === type))
    };
  };

  const status = getCompletionStatus();
  const isReadyForVerification = status.percentage >= 80 && status.documentsComplete && status.profileComplete;

  const handleSubmitForVerification = async () => {
    if (!isReadyForVerification) {
      toast.error('Please complete your profile and upload all required documents before submitting for verification');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update profile status to pending verification
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          status: 'pending_verification',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Try to create verification submission record
      try {
        const { error: submissionError } = await supabase
          .from('verification_submissions')
          .insert({
            user_id: user.id,
            notes: notes || null,
            status: 'pending'
          });

        if (submissionError) {
          console.warn('Could not create verification submission record:', submissionError);
          // Don't fail the whole operation for this
        }
      } catch (err) {
        console.warn('Verification submission table may not exist yet:', err);
      }

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Verification Status
          {getStatusBadge(profile?.status || 'unverified')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Profile Completion</span>
            <span className="text-sm text-muted-foreground">{status.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                status.percentage >= 80 ? 'bg-green-600' : 'bg-blue-600'
              }`}
              style={{ width: `${status.percentage}%` }}
            ></div>
          </div>
        </div>

        {/* Status-specific content */}
        {profile?.status === 'unverified' && (
          <>
            {/* Completion Checklist */}
            <div className="space-y-2">
              <h4 className="font-medium">Verification Requirements:</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className={`h-4 w-4 ${status.profileComplete ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className="text-sm">Complete personal information</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className={`h-4 w-4 ${status.documentsComplete ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className="text-sm">Upload required documents</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className={`h-4 w-4 ${status.hasProfilePicture ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className="text-sm">Upload profile picture</span>
                </div>
              </div>
            </div>

            {/* Missing Items Alert */}
            {(!isReadyForVerification) && (
              <Alert className="bg-orange-50 border-orange-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    {status.missingFields.length > 0 && (
                      <p>Missing fields: {status.missingFields.join(', ')}</p>
                    )}
                    {status.missingDocs.length > 0 && (
                      <p>Missing documents: {status.missingDocs.join(', ')}</p>
                    )}
                    {!status.hasProfilePicture && (
                      <p>Profile picture required</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Notes Section */}
            <div>
              <Label>Additional Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information you'd like to provide..."
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleSubmitForVerification}
              disabled={!isReadyForVerification || submitting}
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
      </CardContent>
    </Card>
  );
};

export default EnhancedVerificationSubmission;
