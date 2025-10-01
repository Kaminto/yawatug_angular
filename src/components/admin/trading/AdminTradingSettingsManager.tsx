import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminTradingSettings } from '@/hooks/useAdminTradingSettings';
import { DynamicPricingSettings } from './DynamicPricingSettings';
import { AutoBuybackSettings } from './AutoBuybackSettings';
import { TransferApprovalSettings } from './TransferApprovalSettings';
import { MarketMakingSettings } from './MarketMakingSettings';
import { NotificationSettings } from './NotificationSettings';

export const AdminTradingSettingsManager: React.FC = () => {
  const {
    dynamicPricing,
    autoBuyback,
    transferApproval,
    marketMaking,
    notifications,
    loading,
    updateDynamicPricing,
    updateAutoBuyback,
    updateTransferApproval,
    updateMarketMaking,
    updateNotifications
  } = useAdminTradingSettings();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trading System Settings</h1>
        <p className="text-muted-foreground">
          Configure automated trading features, pricing, and user experience settings
        </p>
      </div>

      <Tabs defaultValue="pricing" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="pricing">Dynamic Pricing</TabsTrigger>
          <TabsTrigger value="buyback">Auto Buyback</TabsTrigger>
          <TabsTrigger value="transfers">Transfer Approval</TabsTrigger>
          <TabsTrigger value="market">Market Making</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>Dynamic Pricing Settings</CardTitle>
              <CardDescription>
                Configure automated share price calculations based on market activity and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dynamicPricing && (
                <DynamicPricingSettings
                  settings={dynamicPricing}
                  onUpdate={updateDynamicPricing}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="buyback">
          <Card>
            <CardHeader>
              <CardTitle>Auto-Buyback Settings</CardTitle>
              <CardDescription>
                Automatic share buyback triggers based on selling volume thresholds
              </CardDescription>
            </CardHeader>
            <CardContent>
              {autoBuyback && (
                <AutoBuybackSettings
                  settings={autoBuyback}
                  onUpdate={updateAutoBuyback}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Auto-Approval Settings</CardTitle>
              <CardDescription>
                Automate share transfer approvals based on user trust levels and amounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transferApproval && (
                <TransferApprovalSettings
                  settings={transferApproval}
                  onUpdate={updateTransferApproval}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="market">
          <Card>
            <CardHeader>
              <CardTitle>Market Making Settings</CardTitle>
              <CardDescription>
                Provide instant liquidity through automated market making during high-volume periods
              </CardDescription>
            </CardHeader>
            <CardContent>
              {marketMaking && (
                <MarketMakingSettings
                  settings={marketMaking}
                  onUpdate={updateMarketMaking}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure system-wide notification preferences for trading activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notifications && (
                <NotificationSettings
                  settings={notifications}
                  onUpdate={updateNotifications}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};