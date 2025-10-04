
import React from 'react';
import { UnifiedLayout } from '@/components/layout/UnifiedLayout';
import AdminWalletApprovalDashboard from '@/components/admin/wallet/AdminWalletApprovalDashboard';
import { CrossModuleDataProvider } from '@/components/admin/shared/CrossModuleDataProvider';
import { AdminHeader } from '@/components/admin/shared/AdminHeader';
import { useWalletDebug } from '@/hooks/useWalletDebug';

const AdminWalletApprovals = () => {
  const debugInfo = useWalletDebug();
  
  // Add debug console log
  React.useEffect(() => {
    console.log('🔍 WALLET DEBUG INFO:', debugInfo);
  }, [debugInfo]);

  const breadcrumbs = [
    { label: 'Admin', href: '/admin' },
    { label: 'Wallet Management', href: '/admin/wallet' },
    { label: 'Transaction Approvals' }
  ];

  return (
    <CrossModuleDataProvider>
      <UnifiedLayout title="Transaction Approvals" breadcrumbs={breadcrumbs}>
        <AdminHeader />
        <AdminWalletApprovalDashboard />
      </UnifiedLayout>
    </CrossModuleDataProvider>
  );
};

export default AdminWalletApprovals;
