
import React, { useState, useEffect } from 'react';
import { UnifiedLayout } from '@/components/layout/UnifiedLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ShareDataManager } from '@/components/admin/shares/ShareDataManager';
import SharePoolSection from '@/components/admin/shares/sections/SharePoolSection';
import OrderManagementSection from '@/components/admin/shares/sections/OrderManagementSection';
import SettingsSection from '@/components/admin/shares/sections/SettingsSection';
import ClubSharesSection from '@/components/admin/shares/sections/ClubSharesSection';
import ShareHighlights from '@/components/admin/shares/ShareHighlights';
import EnhancedSellOrderManager from '@/components/admin/shares/EnhancedSellOrderManager';
import SharePoolReconciliationPanel from '@/components/admin/shares/SharePoolReconciliationPanel';
import BuybackOrderProcessor from '@/components/admin/shares/BuybackOrderProcessor';
import ShareStockMovementMonitor from '@/components/admin/shares/ShareStockMovementMonitor';

const AdminShares = () => {
  const [activeTab, setActiveTab] = useState('share-pool');
  const [sharePoolSubTab, setSharePoolSubTab] = useState('overview');
  const [orderManagementSubTab, setOrderManagementSubTab] = useState('buying-orders');
  const [clubSharesSubTab, setClubSharesSubTab] = useState('consent-management');
  const [settingsSubTab, setSettingsSubTab] = useState('pricing');

  const breadcrumbs = [
    { label: 'Admin', href: '/admin' },
    { label: 'Share Management' }
  ];

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    console.log(`Navigating to: ${tab}`);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            setActiveTab('share-pool');
            break;
          case '2':
            event.preventDefault();
            setActiveTab('order-management');
            break;
          case '3':
            event.preventDefault();
            setActiveTab('club-shares');
            break;
          case '4':
            event.preventDefault();
            setActiveTab('settings');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getMainTabBadge = (tab: string) => {
    switch (tab) {
      case 'order-management':
        return <Badge variant="secondary" className="ml-2">23</Badge>;
      case 'club-shares':
        return <Badge variant="secondary" className="ml-2">18</Badge>;
      default:
        return null;
    }
  };

  return (
    <UnifiedLayout title="Share Management" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground">
            Yawatu Ordinary Shares Pool Management - Complete oversight of share distribution, pricing, and operations
          </p>
        </div>

        <ShareDataManager>
          {({ shareData, loading, refresh }) => (
            <div className="space-y-6">
              <ShareHighlights shareData={shareData} loading={loading} />
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="w-full overflow-x-auto">
                  <TabsTrigger value="share-pool" className="flex items-center">
                    <span className="hidden sm:inline">Share Pool</span>
                    <span className="sm:hidden">Pool</span>
                    {getMainTabBadge('share-pool')}
                  </TabsTrigger>
                  <TabsTrigger value="order-management" className="flex items-center">
                    <span className="hidden sm:inline">Order Management</span>
                    <span className="sm:hidden">Orders</span>
                    {getMainTabBadge('order-management')}
                  </TabsTrigger>
                  <TabsTrigger value="club-shares" className="flex items-center">
                    <span className="hidden sm:inline">Club Shares</span>
                    <span className="sm:hidden">Club</span>
                    {getMainTabBadge('club-shares')}
                  </TabsTrigger>
                  <TabsTrigger value="stock-movements" className="flex items-center">
                    <span className="hidden sm:inline">Stock Movements</span>
                    <span className="sm:hidden">Movements</span>
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="flex items-center">
                    <span className="hidden sm:inline">Settings</span>
                    <span className="sm:hidden">Config</span>
                    {getMainTabBadge('settings')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="share-pool" className="space-y-4">
                  <SharePoolSection
                    shareData={shareData}
                    loading={loading}
                    refresh={refresh}
                    onNavigate={handleNavigate}
                    activeSubTab={sharePoolSubTab}
                    onSubTabChange={setSharePoolSubTab}
                  />
                </TabsContent>

                <TabsContent value="order-management" className="space-y-4">
                  <OrderManagementSection
                    refresh={refresh}
                    activeSubTab={orderManagementSubTab}
                    onSubTabChange={setOrderManagementSubTab}
                  />
                </TabsContent>

                <TabsContent value="club-shares" className="space-y-4">
                  <ClubSharesSection
                    activeSubTab={clubSharesSubTab}
                    onSubTabChange={setClubSharesSubTab}
                  />
                </TabsContent>

                <TabsContent value="stock-movements" className="space-y-4">
                  <ShareStockMovementMonitor />
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <div className="space-y-6">
                    <SettingsSection
                      shareData={shareData}
                      loading={loading}
                      refresh={refresh}
                      activeSubTab={settingsSubTab}
                      onSubTabChange={setSettingsSubTab}
                    />
                    <SharePoolReconciliationPanel />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </ShareDataManager>
      </div>
    </UnifiedLayout>
  );
};

export default AdminShares;
