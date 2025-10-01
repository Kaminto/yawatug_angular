import React from 'react';
import { UnifiedLayout } from '@/components/layout/UnifiedLayout';
import { InvestmentClubDashboard } from '@/components/investment-club/InvestmentClubDashboard';

const InvestmentClub = () => {
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Investment Club' }
  ];

  return (
    <UnifiedLayout 
      title="Investment Club" 
      breadcrumbs={breadcrumbs}
    >
      <InvestmentClubDashboard />
    </UnifiedLayout>
  );
};

export default InvestmentClub;