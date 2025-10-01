
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { UnifiedLayout } from '@/components/layout/UnifiedLayout';
import ProfileManager from '@/components/profile/ProfileManager';
import ProfileOnboardingWizard from '@/components/profile/ProfileOnboardingWizard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MobileBottomPadding } from '@/components/layout/MobileBottomPadding';

const Profile = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const isWelcomeFlow = searchParams.get('welcome') === 'true';
  const isSetupFlow = searchParams.get('setup') === 'true';

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      setCurrentProfile(profile);
      
      // Show onboarding for new users, setup flow, or if explicitly requested
      if (isWelcomeFlow || isSetupFlow || (profile && profile.profile_completion_percentage < 80)) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    console.log('🎉 Onboarding completed, updating state...');
    
    setShowOnboarding(false);
    
    // Check if this is from activation flow
    const isActivationFlow = searchParams.get('flow') === 'activation';
    
    // Remove parameters from URL
    if (isWelcomeFlow || isSetupFlow) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('welcome');
      newSearchParams.delete('setup');
      newSearchParams.delete('flow');
      setSearchParams(newSearchParams);
    }
    
    // Reload profile to get updated data
    loadProfile();
    
    // Navigate based on the flow type
    if (isSetupFlow || isActivationFlow) {
      console.log('🚀 Activation/setup flow completed, redirecting to smart landing page...');
      navigate('/smart-landing');
    } else {
      console.log('✅ Regular profile completion, redirecting to dashboard...');
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <UnifiedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yawatu-gold"></div>
        </div>
      </UnifiedLayout>
    );
  }

  if (showOnboarding) {
    return (
      <ProfileOnboardingWizard
        onComplete={handleOnboardingComplete}
        currentProfile={currentProfile}
      />
    );
  }

  return (
    <UnifiedLayout>
      <MobileBottomPadding>
        <ProfileManager />
      </MobileBottomPadding>
    </UnifiedLayout>
  );
};

export default Profile;
