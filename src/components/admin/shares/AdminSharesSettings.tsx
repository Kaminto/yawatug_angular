
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, TrendingUp, DollarSign, Users, Calculator, Zap, Package, Shield } from 'lucide-react';
import MarketActivityPricingController from './MarketActivityPricingController';
import PriceHistoryAnalytics from './PriceHistoryAnalytics';
import EnhancedBuybackManager from './EnhancedBuybackManager';
import EnhancedDividendManager from './EnhancedDividendManager';
import ShareFundAllocationManager from './ShareFundAllocationManager';
import AutomatedBuybackProcessor from './AutomatedBuybackProcessor';
import P2PShareMarketplace from './P2PShareMarketplace';
import SmartBuybackProcessor from './SmartBuybackProcessor';
import WalletShareIntegration from './WalletShareIntegration';
import RealComplianceReportingPanel from './RealComplianceReportingPanel';
import LiveCurrencyManager from './LiveCurrencyManager';
import BulkOperationsManager from './BulkOperationsManager';

interface AdminSharesSettingsProps {
  shareData?: any;
  onUpdate?: () => void;
}

const AdminSharesSettings: React.FC<AdminSharesSettingsProps> = ({ shareData, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('pricing');

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
            Advanced Shares Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-10">
              <TabsTrigger value="pricing" className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Pricing</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
              <TabsTrigger value="buyback" className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Buyback</span>
              </TabsTrigger>
              <TabsTrigger value="dividends" className="flex items-center gap-1">
                <Calculator className="h-4 w-4" />
                <span className="hidden sm:inline">Dividends</span>
              </TabsTrigger>
              <TabsTrigger value="p2p-trading" className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">P2P</span>
              </TabsTrigger>
              <TabsTrigger value="automation" className="flex items-center gap-1">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Auto</span>
              </TabsTrigger>
              <TabsTrigger value="fund-allocation" className="flex items-center gap-1">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Funds</span>
              </TabsTrigger>
              <TabsTrigger value="bulk-ops" className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Bulk</span>
              </TabsTrigger>
              <TabsTrigger value="compliance" className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Compliance</span>
              </TabsTrigger>
              <TabsTrigger value="currency" className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Currency</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pricing" className="space-y-4">
              {shareData ? (
                <MarketActivityPricingController shareData={shareData} onUpdate={handleSettingsUpdate} />
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      Create a share pool first to access pricing settings.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {shareData ? (
                <PriceHistoryAnalytics shareData={shareData} />
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      Create a share pool first to access price history.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="buyback" className="space-y-4">
              {shareData ? (
                <EnhancedBuybackManager shareData={shareData} onUpdate={() => Promise.resolve(handleSettingsUpdate())} />
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      Create a share pool first to access buyback settings.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="dividends" className="space-y-4">
              {shareData ? (
                <EnhancedDividendManager shareData={shareData} onUpdate={() => Promise.resolve(handleSettingsUpdate())} />
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      Create a share pool first to access dividend settings.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="p2p-trading" className="space-y-4">
              {shareData ? (
                <P2PShareMarketplace shareData={shareData} onUpdate={() => Promise.resolve(handleSettingsUpdate())} />
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      Create a share pool first to access P2P trading.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="automation" className="space-y-4">
              <div className="space-y-4">
                <AutomatedBuybackProcessor onUpdate={handleSettingsUpdate} />
                {shareData && (
                  <SmartBuybackProcessor shareData={shareData} onUpdate={() => Promise.resolve(handleSettingsUpdate())} />
                )}
              </div>
            </TabsContent>

            <TabsContent value="fund-allocation" className="space-y-4">
              <ShareFundAllocationManager onUpdate={handleSettingsUpdate} />
            </TabsContent>

            <TabsContent value="bulk-ops" className="space-y-4">
              <BulkOperationsManager />
            </TabsContent>

            <TabsContent value="compliance" className="space-y-4">
              <RealComplianceReportingPanel />
            </TabsContent>

            <TabsContent value="currency" className="space-y-4">
              <LiveCurrencyManager />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSharesSettings;
