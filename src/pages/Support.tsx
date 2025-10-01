
import React from 'react';
import { UserLayout } from '@/components/layout/UserLayout';
import SupportTickets from '@/components/support/SupportTickets';

const Support = () => {
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Support' }
  ];

  return (
    <UserLayout title="Support Center" breadcrumbs={breadcrumbs}>
      <div className="space-y-8">
        <div>
          <p className="text-muted-foreground">
            Get help with your account, shares, and other inquiries
          </p>
        </div>

        <SupportTickets />
      </div>
    </UserLayout>
  );
};

export default Support;
