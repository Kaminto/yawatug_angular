import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ProfileEditRequest from './ProfileEditRequest';

interface ProfileEditRequestHandlerProps {
  onEditEnabled: () => void;
}

const ProfileEditRequestHandler: React.FC<ProfileEditRequestHandlerProps> = ({ onEditEnabled }) => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(profile);

      // If user can edit (not verified or edit approved), enable editing
      if (!profile.is_verified || profile.edit_approved || profile.edit_request_status === 'approved') {
        onEditEnabled();
      }

    } catch (error) {
      console.error('Error loading user profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = () => {
    loadUserProfile();
  };

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  if (!userProfile) {
    return <div>Error loading profile</div>;
  }

  // If user is not verified or has edit approval, they can edit
  if (!userProfile.is_verified || userProfile.edit_approved || userProfile.edit_request_status === 'approved') {
    return null; // The parent component will show the editor
  }

  // Show edit request component for verified users
  return (
    <ProfileEditRequest
      userId={userProfile.id}
      isVerified={userProfile.is_verified}
      editRequestStatus={userProfile.edit_request_status}
      lastEditRequest={userProfile.last_edit_request}
      onStatusChange={handleStatusChange}
    />
  );
};

export default ProfileEditRequestHandler;
