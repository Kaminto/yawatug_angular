
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, ArrowRight, Shield } from "lucide-react";
import { ProfileData, ContactPerson, UserDocument } from '@/types/profile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { calculateProfileCompletion, getCompletionColor, getNextSteps } from './ProfileCompletionCalculator';
import { EnhancedLoading } from '@/components/ui/enhanced-loading';
import { useAutoApproval } from '@/hooks/useAutoApproval';

interface EnhancedProfileCompletionTrackerProps {
  profile: ProfileData;
  documents: UserDocument[];
  contactPersons: ContactPerson[];
  onRefresh?: () => void;
}

const EnhancedProfileCompletionTracker: React.FC<EnhancedProfileCompletionTrackerProps> = ({
  profile,
  documents,
  contactPersons,
  onRefresh
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { checkAutoApproval, processing } = useAutoApproval();

  const { breakdown, totalScore, percentage } = calculateProfileCompletion(profile, documents, contactPersons);
  const nextSteps = getNextSteps(breakdown);

  const refreshCompletion = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Call auto-approval function to recalculate and potentially approve
      await checkAutoApproval(user.id);

      // Trigger a profile update to recalculate completion
      const { error } = await supabase
        .from('profiles')
        .update({ last_profile_update: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;

      if (onRefresh) {
        onRefresh();
      }
      
      toast.success('Profile completion refreshed');
    } catch (error) {
      console.error('Error refreshing completion:', error);
      toast.error('Failed to refresh completion');
    } finally {
      setLoading(false);
    }
  };

  const submitForVerification = async () => {
    if (percentage < 80) {
      toast.error('Please complete at least 80% of your profile before submitting for verification');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ status: 'pending_verification' })
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success('Profile submitted for verification successfully!');
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error submitting for verification:', error);
      toast.error('Failed to submit for verification');
    } finally {
      setSubmitting(false);
    }
  };

  const getVerificationStatus = () => {
    if (profile?.status === 'active') return { color: 'text-green-600', label: 'Verified', icon: <CheckCircle className="h-4 w-4" /> };
    if (profile?.status === 'pending_verification') return { color: 'text-yellow-600', label: 'Under Review', icon: <Shield className="h-4 w-4" /> };
    if (profile?.status === 'blocked') return { color: 'text-red-600', label: 'Blocked', icon: <AlertCircle className="h-4 w-4" /> };
    return { color: 'text-gray-600', label: 'Unverified', icon: <AlertCircle className="h-4 w-4" /> };
  };

  const verificationStatus = getVerificationStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Profile Completion</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getCompletionColor(percentage)}>
              {percentage}%
            </Badge>
            <Badge variant="outline" className={verificationStatus.color}>
              {verificationStatus.icon}
              {verificationStatus.label}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Admin Feedback Display */}
        {profile?.status === 'unverified' && profile?.verification_notes && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Admin Feedback</p>
                <p className="text-sm text-yellow-700 mt-1">{profile.verification_notes}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Overall Progress */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className={`text-sm font-medium ${getCompletionColor(percentage)}`}>{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-3" />
          <div className="text-xs text-muted-foreground text-center">
            {totalScore}/100 points completed
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Completion Breakdown</h4>
          {Object.entries(breakdown).map(([key, category]) => (
            <div key={key} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span className="text-xs text-muted-foreground">
                  {category.score}/{category.total} points
                </span>
              </div>
              <Progress value={(category.score / category.total) * 100} className="h-1" />
            </div>
          ))}
        </div>

        {/* Priority Actions */}
        {nextSteps.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Next Steps</h4>
            <div className="space-y-2">
              {nextSteps.map((item, index) => (
                <div key={item.field} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    +{item.points}
                  </div>
                  <span className="text-sm flex-1">{item.label}</span>
                  <ArrowRight className="h-3 w-3 text-gray-400" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshCompletion}
            disabled={loading || processing}
          >
            {(loading || processing) ? <EnhancedLoading size="sm" text="Processing..." /> : 'Check Auto-Approval'}
          </Button>
          
          {percentage >= 80 && profile?.status === 'unverified' && (
            <Button size="sm" onClick={submitForVerification} disabled={submitting}>
              {submitting ? (
                <EnhancedLoading size="sm" text="Submitting..." />
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Submit for Verification
                </>
              )}
            </Button>
          )}
        </div>

        {/* Achievement Message */}
        {percentage === 100 && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">Profile Complete!</p>
                <p className="text-sm text-green-700">
                  {profile?.status === 'unverified' 
                    ? 'You can now submit your profile for verification.'
                    : 'Your profile is complete and verified.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedProfileCompletionTracker;
