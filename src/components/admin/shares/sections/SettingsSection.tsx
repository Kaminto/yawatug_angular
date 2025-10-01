import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import MarketActivityPricingController from '../MarketActivityPricingController';
import ShareFundAllocationManager from '../ShareFundAllocationManager';
import ReserveSettingsManager from '../ReserveSettingsManager';
import TradeControlsPanel from '../TradeControlsPanel';
import PriceHistoryAnalytics from '../PriceHistoryAnalytics';

interface ShareData {
  id: string;
  name: string;
  price_per_share: number;
  available_shares: number;
  total_shares: number;
  currency: string;
  [key: string]: any;
}

interface SettingsSectionProps {
  shareData: ShareData | null;
  loading: boolean;
  refresh: () => void;
  activeSubTab: string;
  onSubTabChange: (tab: string) => void;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
  shareData,
  loading,
  refresh,
  activeSubTab,
  onSubTabChange
}) => {
  const getTabBadge = (tab: string) => {
    switch (tab) {
      case 'pricing':
        return <Badge variant="secondary" className="ml-2">
          {shareData?.pricing_metadata?.method || 'Auto'}
        </Badge>;
      case 'fund-allocation':
        return <Badge variant="secondary" className="ml-2">Dynamic</Badge>;
      case 'share-reserve':
        return <Badge variant="secondary" className="ml-2">
          {shareData?.reserve_rate_percent || 15}%
        </Badge>;
      case 'trade-limits':
        return <Badge variant="destructive" className="ml-2">Enforced</Badge>;
      case 'history':
        return <Badge variant="outline" className="ml-2">Live</Badge>;
      default:
        return null;
    }
  };

  return (
    <Tabs value={activeSubTab} onValueChange={onSubTabChange} className="space-y-4">
      <TabsList className="grid grid-cols-5 w-full">
        <TabsTrigger value="pricing" className="flex items-center">
          Pricing
          {getTabBadge('pricing')}
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center">
          History
          {getTabBadge('history')}
        </TabsTrigger>
        <TabsTrigger value="fund-allocation" className="flex items-center">
          Fund Allocation
          {getTabBadge('fund-allocation')}
        </TabsTrigger>
        <TabsTrigger value="share-reserve" className="flex items-center">
          Share Reserve
          {getTabBadge('share-reserve')}
        </TabsTrigger>
        <TabsTrigger value="trade-limits" className="flex items-center">
          Trade Limits
          {getTabBadge('trade-limits')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pricing" className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading pricing data...</span>
          </div>
        ) : shareData ? (
          <MarketActivityPricingController 
            shareData={shareData} 
            onUpdate={refresh}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Share data required for pricing settings
          </div>
        )}
      </TabsContent>

      <TabsContent value="history" className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading price history...</span>
          </div>
        ) : shareData ? (
          <PriceHistoryAnalytics shareData={shareData} />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Share data required for price history
          </div>
        )}
      </TabsContent>

      <TabsContent value="fund-allocation" className="space-y-4">
        <ShareFundAllocationManager onUpdate={refresh} />
      </TabsContent>

      <TabsContent value="share-reserve" className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading reserve settings...</span>
          </div>
        ) : shareData ? (
          <ReserveSettingsManager 
            shareData={shareData} 
            onUpdate={refresh}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Share data required for reserve settings
          </div>
        )}
      </TabsContent>

      <TabsContent value="trade-limits" className="space-y-4">
        <TradeControlsPanel />
      </TabsContent>
    </Tabs>
  );
};

export default SettingsSection;