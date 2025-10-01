import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import ProfileCompletionCheck from './ProfileCompletionCheck';

interface ProfileUpdateGuardProps {
  children: React.ReactNode;
}

const ProfileUpdateGuard: React.FC<ProfileUpdateGuardProps> = ({ children }) => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);

  // Only show ProfileCompletionCheck for authenticated users with profiles
  if (!user || !profile) {
    return <>{children}</>;
  }

  return (
    <>
      <ProfileCompletionCheck />
      {children}
    </>
  );
};

export default ProfileUpdateGuard;