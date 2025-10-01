
import React, { useState, useEffect } from 'react';
import { UnifiedLayout } from '@/components/layout/UnifiedLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminSubWalletsOverview from '@/components/admin/wallet/AdminSubWalletsOverview';
import AdminSubWalletManagement from '@/components/admin/wallet/AdminSubWalletManagement';
import UserWalletLimitsManager from '@/components/admin/wallet/UserWalletLimitsManager';
import AdminExpenseManager from '@/components/admin/wallet/AdminExpenseManager';
import UnifiedFinancialDashboard from '@/components/admin/wallet/UnifiedFinancialDashboard';
import UserWalletsOverview from '@/components/admin/wallet/UserWalletsOverview';
import TransactionApprovalManager from '@/components/admin/wallet/TransactionApprovalManager';
import UserTransferManager from '@/components/admin/wallet/UserTransferManager';
import FinancialAnalyticsDashboard from '@/components/admin/wallet/FinancialAnalyticsDashboard';
import AdminWalletSettings from '@/components/admin/wallet/AdminWalletSettings';
import FundFlowAnalysis from '@/components/admin/wallet/FundFlowAnalysis';
import PerformanceMetrics from '@/components/admin/wallet/PerformanceMetrics';
import TransactionReports from '@/components/admin/wallet/TransactionReports';
import FundAllocationReports from '@/components/admin/wallet/FundAllocationReports';
import UserActivityReports from '@/components/admin/wallet/UserActivityReports';
import FinancialStatements from '@/components/admin/wallet/FinancialStatements';
import EnhancedWalletDashboard from '@/components/admin/wallet/EnhancedWalletDashboard';
import EnhancedTransactionApprovalManager from '@/components/admin/wallet/EnhancedTransactionApprovalManager';

const AdminWallet = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSubTab, setActiveSubTab] = useState({
    dashboard: 'overview',
    approvals: 'pending',
    admin: 'fund-overview',
    users: 'wallets-overview',
    analytics: 'financial-dashboard',
    reports: 'transaction-reports',
    settings: 'fee-configuration'
  });

  const breadcrumbs = [
    { label: 'Admin', href: '/admin' },
    { label: 'Wallet Management' }
  ];

  // Handle URL hash navigation for quick actions
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      if (hash === 'approvals') {
        setActiveTab('approvals');
      } else if (hash === 'fund-transfers') {
        setActiveTab('admin');
        setActiveSubTab(prev => ({ ...prev, admin: 'fund-transfers' }));
      } else if (hash === 'user-wallets') {
        setActiveTab('users');
        setActiveSubTab(prev => ({ ...prev, users: 'wallets-overview' }));
      } else if (hash === 'analytics') {
        setActiveTab('analytics');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Clear hash when manually changing tabs
    if (window.location.hash) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const handleSubTabChange = (subTab: string) => {
    setActiveSubTab(prev => ({
      ...prev,
      [activeTab]: subTab
    }));
  };

  return (
    <UnifiedLayout title="Wallet Management" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground">
            Comprehensive wallet management system with real-time monitoring, advanced reporting, and system-wide oversight
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="admin">Admin Funds</TabsTrigger>
            <TabsTrigger value="users">User Wallets</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Enhanced Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            <EnhancedWalletDashboard />
          </TabsContent>

          {/* Enhanced Approvals Tab */}
          <TabsContent value="approvals" className="space-y-4">
            <EnhancedTransactionApprovalManager />
          </TabsContent>

          {/* Admin Tab */}
          <TabsContent value="admin" className="space-y-4">
            <Tabs value={activeSubTab.admin} onValueChange={handleSubTabChange} className="space-y-4">
              <TabsList className="w-full overflow-x-auto">
                <TabsTrigger value="fund-overview">
                  <span className="hidden sm:inline">Fund Overview</span>
                  <span className="sm:hidden">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="fund-transfers">
                  <span className="hidden sm:inline">Fund Transfers</span>
                  <span className="sm:hidden">Transfers</span>
                </TabsTrigger>
                <TabsTrigger value="expense-management">
                  <span className="hidden sm:inline">Expense Management</span>
                  <span className="sm:hidden">Expenses</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="fund-overview">
                <AdminSubWalletsOverview />
              </TabsContent>

              <TabsContent value="fund-transfers">
                <AdminSubWalletManagement onUpdate={() => {}} />
              </TabsContent>

              <TabsContent value="expense-management">
                <AdminExpenseManager />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Tabs value={activeSubTab.users} onValueChange={handleSubTabChange} className="space-y-4">
              <TabsList className="w-full overflow-x-auto">
                <TabsTrigger value="wallets-overview">
                  <span className="hidden sm:inline">Wallets Overview</span>
                  <span className="sm:hidden">Wallets</span>
                </TabsTrigger>
                <TabsTrigger value="wallet-limits">
                  <span className="hidden sm:inline">Wallet Limits</span>
                  <span className="sm:hidden">Limits</span>
                </TabsTrigger>
                <TabsTrigger value="transaction-approvals">
                  <span className="hidden sm:inline">Transaction Approvals</span>
                  <span className="sm:hidden">Approvals</span>
                </TabsTrigger>
                <TabsTrigger value="user-transfers">
                  <span className="hidden sm:inline">User Transfers</span>
                  <span className="sm:hidden">Transfers</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="wallets-overview">
                <UserWalletsOverview />
              </TabsContent>

              <TabsContent value="wallet-limits">
                <UserWalletLimitsManager />
              </TabsContent>

              <TabsContent value="transaction-approvals">
                <TransactionApprovalManager />
              </TabsContent>

              <TabsContent value="user-transfers">
                <UserTransferManager />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <Tabs value={activeSubTab.analytics} onValueChange={handleSubTabChange} className="space-y-4">
              <TabsList className="w-full overflow-x-auto">
                <TabsTrigger value="financial-dashboard">
                  <span className="hidden sm:inline">Financial Dashboard</span>
                  <span className="sm:hidden">Dashboard</span>
                </TabsTrigger>
                <TabsTrigger value="revenue-analytics">
                  <span className="hidden sm:inline">Revenue Analytics</span>
                  <span className="sm:hidden">Revenue</span>
                </TabsTrigger>
                <TabsTrigger value="fund-flow">
                  <span className="hidden sm:inline">Fund Flow Analysis</span>
                  <span className="sm:hidden">Flow</span>
                </TabsTrigger>
                <TabsTrigger value="performance-metrics">
                  <span className="hidden sm:inline">Performance Metrics</span>
                  <span className="sm:hidden">Metrics</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="financial-dashboard">
                <UnifiedFinancialDashboard />
              </TabsContent>

              <TabsContent value="revenue-analytics">
                <FinancialAnalyticsDashboard />
              </TabsContent>

              <TabsContent value="fund-flow">
                <FundFlowAnalysis />
              </TabsContent>

              <TabsContent value="performance-metrics">
                <PerformanceMetrics />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <Tabs value={activeSubTab.reports} onValueChange={handleSubTabChange} className="space-y-4">
              <TabsList className="w-full overflow-x-auto">
                <TabsTrigger value="transaction-reports">
                  <span className="hidden sm:inline">Transaction Reports</span>
                  <span className="sm:hidden">Transactions</span>
                </TabsTrigger>
                <TabsTrigger value="fund-allocation">
                  <span className="hidden sm:inline">Fund Allocation Reports</span>
                  <span className="sm:hidden">Allocation</span>
                </TabsTrigger>
                <TabsTrigger value="user-activity">
                  <span className="hidden sm:inline">User Activity Reports</span>
                  <span className="sm:hidden">Activity</span>
                </TabsTrigger>
                <TabsTrigger value="financial-statements">
                  <span className="hidden sm:inline">Financial Statements</span>
                  <span className="sm:hidden">Statements</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="transaction-reports">
                <TransactionReports />
              </TabsContent>

              <TabsContent value="fund-allocation">
                <FundAllocationReports />
              </TabsContent>

              <TabsContent value="user-activity">
                <UserActivityReports />
              </TabsContent>

              <TabsContent value="financial-statements">
                <FinancialStatements />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <AdminWalletSettings onUpdate={() => {}} />
          </TabsContent>
        </Tabs>
      </div>
    </UnifiedLayout>
  );
};

export default AdminWallet;
