import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Mail, 
  User, 
  Upload, 
  Phone, 
  Shield,
  ArrowRight,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface OnboardingStatus {
  id: string;
  current_step: string;
  completed_steps: string[];
  onboarding_started_at: string;
  onboarding_completed_at?: string;
  is_imported_user: boolean;
  welcome_message_shown: boolean;
  profile_completion_guided: boolean;
  verification_guidance_shown: boolean;
}

interface ProfileStatus {
  status: string;
  profile_completion_percentage: number;
  is_verified: boolean;
  account_activation_status?: string;
  verification_submitted_at?: string;
  documents_count: number;
  contacts_count: number;
}

const OnboardingStatusDashboard = () => {
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOnboardingData();
  }, []);

  const loadOnboardingData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Load onboarding status
      const { data: onboarding, error: onboardingError } = await supabase
        .from('user_onboarding_status')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (onboardingError) throw onboardingError;

      // Load profile status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          status,
          profile_completion_percentage,
          is_verified,
          account_activation_status,
          verification_submitted_at,
          user_documents (*),
          contact_persons (*)
        `)
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      setOnboardingStatus(onboarding);
      setProfileStatus({
        ...profile,
        documents_count: profile.user_documents?.length || 0,
        contacts_count: profile.contact_persons?.length || 0
      });

        // Create onboarding status if it doesn't exist
        if (!onboarding) {
          const { error: createError } = await supabase
            .from('user_onboarding_status')
            .insert({
              user_id: user.id,
              current_step: (profile as any).import_batch_id ? 'activation' : 'welcome',
              is_imported_user: !!(profile as any).import_batch_id
            });

        if (!createError) {
          loadOnboardingData(); // Reload after creation
        }
      }
    } catch (error) {
      console.error('Error loading onboarding data:', error);
      toast.error('Failed to load onboarding status');
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async () => {
    setRefreshing(true);
    await loadOnboardingData();
    setRefreshing(false);
    toast.success('Status refreshed');
  };

  const updateOnboardingStep = async (step: string, markCompleted: boolean = true) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates: any = {
        current_step: step,
        updated_at: new Date().toISOString()
      };

      if (markCompleted && onboardingStatus) {
        const completedSteps = [...(onboardingStatus.completed_steps || [])];
        if (!completedSteps.includes(onboardingStatus.current_step)) {
          completedSteps.push(onboardingStatus.current_step);
        }
        updates.completed_steps = completedSteps;
      }

      const { error } = await supabase
        .from('user_onboarding_status')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;
      loadOnboardingData();
    } catch (error) {
      console.error('Error updating onboarding step:', error);
    }
  };

  const getStepStatus = (stepName: string) => {
    if (!onboardingStatus) return 'pending';
    
    if (onboardingStatus.completed_steps?.includes(stepName)) {
      return 'completed';
    } else if (onboardingStatus.current_step === stepName) {
      return 'current';
    } else {
      return 'pending';
    }
  };

  const getOverallProgress = () => {
    if (!profileStatus) return 0;
    
    let progress = 0;
    
    // Account activation (20%)
    if (profileStatus.account_activation_status === 'activated' || !onboardingStatus?.is_imported_user) {
      progress += 20;
    }
    
    // Profile completion (40%)
    progress += (profileStatus.profile_completion_percentage || 0) * 0.4;
    
    // Document submission (20%)
    if (profileStatus.documents_count >= 2) {
      progress += 20;
    }
    
    // Verification submission (20%)
    if (profileStatus.verification_submitted_at) {
      progress += 20;
    }
    
    return Math.min(progress, 100);
  };

  const getNextAction = () => {
    if (!profileStatus || !onboardingStatus) return null;

    if (onboardingStatus.is_imported_user && profileStatus.account_activation_status !== 'activated') {
      return {
        title: 'Activate Your Account',
        description: 'Check your email for an activation link',
        action: 'Check Email',
        icon: Mail,
        urgent: true
      };
    }

    if ((profileStatus.profile_completion_percentage || 0) < 80) {
      return {
        title: 'Complete Your Profile',
        description: 'Add missing information to reach 80% completion',
        action: 'Complete Profile',
        link: '/profile',
        icon: User,
        urgent: false
      };
    }

    if (profileStatus.documents_count < 2) {
      return {
        title: 'Upload Documents',
        description: 'Upload at least 2 identity documents',
        action: 'Upload Documents',
        link: '/profile#documents',
        icon: Upload,
        urgent: false
      };
    }

    if (!profileStatus.verification_submitted_at) {
      return {
        title: 'Submit for Verification',
        description: 'Submit your profile for admin review',
        action: 'Submit Now',
        link: '/profile#verification',
        icon: Shield,
        urgent: false
      };
    }

    if (profileStatus.status === 'pending_verification') {
      return {
        title: 'Verification in Progress',
        description: 'Your profile is being reviewed by our team',
        action: 'Track Progress',
        icon: Clock,
        urgent: false
      };
    }

    return null;
  };

  const getStatusBadge = () => {
    if (!profileStatus) return null;

    const statusConfig = {
      active: { label: 'Active', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      pending_verification: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      unverified: { label: 'Unverified', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
      blocked: { label: 'Blocked', color: 'bg-red-100 text-red-800', icon: AlertTriangle }
    };

    const config = statusConfig[profileStatus.status as keyof typeof statusConfig];
    if (!config) return null;

    const IconComponent = config.icon;

    return (
      <Badge className={config.color}>
        <IconComponent className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-pulse">Loading your onboarding status...</div>
        </CardContent>
      </Card>
    );
  }

  const nextAction = getNextAction();
  const overallProgress = getOverallProgress();

  return (
    <div className="space-y-6">
      {/* Overall Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Account Setup Progress</span>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshStatus}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span className="font-medium">{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>

          {profileStatus && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <p className="font-medium">{Math.round(profileStatus.profile_completion_percentage || 0)}%</p>
                <p className="text-muted-foreground">Profile Complete</p>
              </div>
              <div className="text-center">
                <p className="font-medium">{profileStatus.documents_count}</p>
                <p className="text-muted-foreground">Documents</p>
              </div>
              <div className="text-center">
                <p className="font-medium">{profileStatus.contacts_count}</p>
                <p className="text-muted-foreground">Contacts</p>
              </div>
              <div className="text-center">
                <p className="font-medium">
                  {profileStatus.verification_submitted_at ? 'Yes' : 'No'}
                </p>
                <p className="text-muted-foreground">Submitted</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next Action Card */}
      {nextAction && (
        <Card className={nextAction.urgent ? 'border-yellow-200 bg-yellow-50' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <nextAction.icon className="h-5 w-5" />
              Next Step: {nextAction.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{nextAction.description}</p>
            
            {nextAction.link ? (
              <Button asChild>
                <Link to={nextAction.link} className="flex items-center gap-2">
                  {nextAction.action}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button variant="outline">
                {nextAction.action}
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Onboarding Steps */}
      {onboardingStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Setup Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {onboardingStatus.is_imported_user && (
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                    profileStatus?.account_activation_status === 'activated' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-yellow-100 text-yellow-600'
                  }`}>
                    {profileStatus?.account_activation_status === 'activated' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Account Activation</p>
                    <p className="text-sm text-muted-foreground">
                      {profileStatus?.account_activation_status === 'activated' 
                        ? 'Your account has been activated' 
                        : 'Check your email for activation instructions'
                      }
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                  (profileStatus?.profile_completion_percentage || 0) >= 80
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {(profileStatus?.profile_completion_percentage || 0) >= 80 ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">Complete Profile Information</p>
                  <p className="text-sm text-muted-foreground">
                    {(profileStatus?.profile_completion_percentage || 0) >= 80 
                      ? 'Profile is complete' 
                      : `${Math.round(profileStatus?.profile_completion_percentage || 0)}% complete - Add more details`
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                  (profileStatus?.documents_count || 0) >= 2
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {(profileStatus?.documents_count || 0) >= 2 ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">Upload Identity Documents</p>
                  <p className="text-sm text-muted-foreground">
                    {(profileStatus?.documents_count || 0) >= 2 
                      ? 'Documents uploaded' 
                      : `${profileStatus?.documents_count || 0}/2 documents uploaded`
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                  profileStatus?.verification_submitted_at
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {profileStatus?.verification_submitted_at ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">Submit for Verification</p>
                  <p className="text-sm text-muted-foreground">
                    {profileStatus?.verification_submitted_at 
                      ? 'Submitted for review' 
                      : 'Submit your profile for admin verification'
                    }
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help & Support */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            If you're having trouble with any step, our support team is here to help.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Phone className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
            <Button variant="outline" size="sm">
              View Help Guide
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingStatusDashboard;