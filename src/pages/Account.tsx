import React, { useState, useEffect } from 'react';
import { UserLayout } from '@/components/layout/UserLayout';
import UserAccountHub from '@/components/shares/UserAccountHub';
import { useContextualData } from '@/hooks/useContextualData';
import { supabase } from '@/integrations/supabase/client';

const Account = () => {
  const { currentUserId } = useContextualData();
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUserId)
        .single();
      setUserProfile(data);
    };
    if (currentUserId) loadUserProfile();
  }, [currentUserId]);
  
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Account' }
  ];

  return (
    <UserLayout title="Account Settings" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your account information, preferences, and settings
          </p>
        </div>

        <UserAccountHub 
          userProfile={userProfile}
          userId={currentUserId}
          onUpdate={() => {
            // Reload profile data
            if (currentUserId) {
              supabase
                .from('profiles')
                .select('*')
                .eq('id', currentUserId)
                .single()
                .then(({ data }) => setUserProfile(data));
            }
          }}
        />
      </div>
    </UserLayout>
  );
};

export default Account;