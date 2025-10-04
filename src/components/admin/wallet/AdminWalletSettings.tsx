
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, DollarSign, Bell, Shield, Globe, Sliders, CreditCard, Building2 } from 'lucide-react';
import EditableTransactionFeesManager from './EditableTransactionFeesManager';
import EditableAllocationRulesManager from './EditableAllocationRulesManager';
import LiveCurrencyManager from '../shares/LiveCurrencyManager';
import AdminSubWalletManagement from './AdminSubWalletManagement';
import UserWalletLimitsManager from './UserWalletLimitsManager';
import SecuritySettings from './SecuritySettings';
import RelWorxConfigurationManager from '../RelWorxConfigurationManager';
import { MerchantCodesManager } from './MerchantCodesManager';
import { BankAccountsManager } from './BankAccountsManager';

interface AdminWalletSettingsProps {
  onUpdate?: () => void;
}

const AdminWalletSettings: React.FC<AdminWalletSettingsProps> = ({ onUpdate }) => {
  const [activeTab, setActiveTab] = useState('transaction-fees');

  const handleSettingsUpdate = () => {
    if (onUpdate) {
      onUpdate();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Admin Wallet Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="w-full overflow-x-auto">
              <TabsTrigger value="transaction-fees" className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Fees</span>
              </TabsTrigger>
              <TabsTrigger value="fund-allocation" className="flex items-center gap-1">
                <Sliders className="h-4 w-4" />
                <span className="hidden sm:inline">Allocation</span>
              </TabsTrigger>
              <TabsTrigger value="currencies" className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">Currency</span>
              </TabsTrigger>
              <TabsTrigger value="admin-wallets" className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Wallets</span>
              </TabsTrigger>
              <TabsTrigger value="user-limits" className="flex items-center gap-1">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Limits</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
              <TabsTrigger value="merchant-codes" className="flex items-center gap-1">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Merchant Codes</span>
              </TabsTrigger>
              <TabsTrigger value="bank-accounts" className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Bank Accounts</span>
              </TabsTrigger>
              <TabsTrigger value="relworx" className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">RelWorx</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transaction-fees" className="space-y-4">
              <EditableTransactionFeesManager />
            </TabsContent>

            <TabsContent value="fund-allocation" className="space-y-4">
              <EditableAllocationRulesManager />
            </TabsContent>

            <TabsContent value="currencies" className="space-y-4">
              <LiveCurrencyManager />
            </TabsContent>

            <TabsContent value="admin-wallets" className="space-y-4">
              <AdminSubWalletManagement onUpdate={handleSettingsUpdate} />
            </TabsContent>

            <TabsContent value="user-limits" className="space-y-4">
              <UserWalletLimitsManager />
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <SecuritySettings />
            </TabsContent>

            <TabsContent value="merchant-codes" className="space-y-4">
              <MerchantCodesManager />
            </TabsContent>

            <TabsContent value="bank-accounts" className="space-y-4">
              <BankAccountsManager />
            </TabsContent>

            <TabsContent value="relworx" className="space-y-4">
              <RelWorxConfigurationManager />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWalletSettings;
