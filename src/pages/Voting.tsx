
import React from 'react';
import { UserLayout } from '@/components/layout/UserLayout';
import VotingDashboard from '@/components/voting/VotingDashboard';

const Voting = () => {
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Voting' }
  ];

  return (
    <UserLayout title="Shareholder Voting" breadcrumbs={breadcrumbs}>
      <div className="space-y-8">
        <div>
          <p className="text-muted-foreground">
            Participate in company decisions and vote on important matters
          </p>
        </div>

        <VotingDashboard />
      </div>
    </UserLayout>
  );
};

export default Voting;
