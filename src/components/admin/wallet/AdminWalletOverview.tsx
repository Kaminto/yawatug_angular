
import React, { useState } from 'react';
import EnhancedAdminWalletOverview from './EnhancedAdminWalletOverview';
import UserWalletMonitor from './UserWalletMonitor';
import TransactionHistory from './TransactionHistory';
import PendingApprovalsQueue from './PendingApprovalsQueue';
import CurrencyManager from './CurrencyManager';
import AdminSubWalletManagement from './AdminSubWalletManagement';
import UserWalletLimitsManager from './UserWalletLimitsManager';
import TransactionFeesManager from './TransactionFeesManager';
import SystemWideWalletMonitor from './SystemWideWalletMonitor';
import EnhancedRealTimeTransactionMonitor from './EnhancedRealTimeTransactionMonitor';
import RealAnomalyDetectionPanel from './RealAnomalyDetectionPanel';
import UnifiedFinancialDashboard from './UnifiedFinancialDashboard';
import AdvancedReporting from './AdvancedReporting';
import AdminWalletSettings from './AdminWalletSettings';
import WalletHealthMonitor from './WalletHealthMonitor';
import ComplianceReportingPanel from './ComplianceReportingPanel';

interface AdminWalletOverviewProps {
  onNavigate: (tab: string) => void;
}

const AdminWalletOverview: React.FC<AdminWalletOverviewProps> = ({ onNavigate }) => {
  const [activeView, setActiveView] = useState('overview');

  const handleNavigation = (view: string) => {
    setActiveView(view);
    onNavigate(view);
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'unified-dashboard':
        return <UnifiedFinancialDashboard />;
      case 'system-monitor':
        return <SystemWideWalletMonitor />;
      case 'real-time':
        return <EnhancedRealTimeTransactionMonitor />;
      case 'anomaly-detection':
        return <RealAnomalyDetectionPanel />;
      case 'health-monitor':
        return <WalletHealthMonitor />;
      case 'compliance':
        return <ComplianceReportingPanel />;
      case 'reporting':
        return <AdvancedReporting />;
      case 'user-wallets':
        return <UserWalletMonitor />;
      case 'transactions':
        return <TransactionHistory />;
      case 'approvals':
        return <PendingApprovalsQueue onApprovalUpdate={() => setActiveView('overview')} />;
      case 'currencies':
        return <CurrencyManager />;
      case 'admin-wallets':
        return <AdminSubWalletManagement onUpdate={() => {}} />;
      case 'user-limits':
        return <UserWalletLimitsManager />;
      case 'fees':
        return <TransactionFeesManager />;
      case 'settings':
        return <AdminWalletSettings onUpdate={() => setActiveView('overview')} />;
      default:
        return <EnhancedAdminWalletOverview onNavigate={handleNavigation} />;
    }
  };

  return (
    <div className="space-y-6">
      {renderActiveView()}
    </div>
  );
};

export default AdminWalletOverview;
