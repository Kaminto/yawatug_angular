import React, { useState, useEffect } from 'react';
import { UserLayout } from '@/components/layout/UserLayout';
import { supabase } from '@/integrations/supabase/client';
import SimplifiedReferralDashboard from '@/components/referral/SimplifiedReferralDashboard';

const Referrals = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Referrals' }
  ];

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <UserLayout title="Referral Program" breadcrumbs={breadcrumbs}>
        <div className="animate-pulse">Loading...</div>
      </UserLayout>
    );
  }

  if (!user) {
    return (
      <UserLayout title="Referral Program" breadcrumbs={breadcrumbs}>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Please log in to access the referral program.</p>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout title="Earn 5% Commissions" breadcrumbs={breadcrumbs}>
      <div className="w-full max-w-full overflow-x-hidden">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Referral Program</h1>
          <p className="text-muted-foreground mt-2">
            Invite friends to invest in gold mining shares and earn 5% commission on every purchase
          </p>
        </div>
        
        <SimplifiedReferralDashboard userId={user.id} />
      </div>
    </UserLayout>
  );
};

export default Referrals;