import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useOrderCounts } from '@/hooks/useOrderCounts';
import BuyingOrdersManager from '../BuyingOrdersManager';
import UnifiedSellOrdersManager from '../UnifiedSellOrdersManager';
import ShareTransferManager from '../ShareTransferManager';

interface OrderManagementSectionProps {
  refresh: () => void;
  activeSubTab: string;
  onSubTabChange: (tab: string) => void;
}

const OrderManagementSection: React.FC<OrderManagementSectionProps> = ({
  refresh,
  activeSubTab,
  onSubTabChange
}) => {
  const { buyingOrders, sellingOrders, transferRequests, loading } = useOrderCounts();

  const getTabBadge = (tab: string) => {
    if (loading) {
      return <Badge variant="outline" className="ml-2">...</Badge>;
    }
    
    switch (tab) {
      case 'buying-orders':
        return buyingOrders > 0 ? (
          <Badge variant="secondary" className="ml-2">{buyingOrders} Active</Badge>
        ) : null;
      case 'selling-orders':
        return sellingOrders > 0 ? (
          <Badge variant="secondary" className="ml-2">{sellingOrders} Pending</Badge>
        ) : null;
      case 'share-transfer':
        return transferRequests > 0 ? (
          <Badge variant="secondary" className="ml-2">{transferRequests} Processing</Badge>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <Tabs value={activeSubTab} onValueChange={onSubTabChange} className="space-y-4">
      <TabsList className="grid grid-cols-3 w-full">
        <TabsTrigger value="buying-orders" className="flex items-center">
          Buy Orders
          {getTabBadge('buying-orders')}
        </TabsTrigger>
        <TabsTrigger value="selling-orders" className="flex items-center">
          Sell Orders
          {getTabBadge('selling-orders')}
        </TabsTrigger>
        <TabsTrigger value="share-transfer" className="flex items-center">
          Transfer Orders
          {getTabBadge('share-transfer')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="buying-orders" className="space-y-4">
        <BuyingOrdersManager />
      </TabsContent>

      <TabsContent value="selling-orders" className="space-y-4">
        <UnifiedSellOrdersManager />
      </TabsContent>

      <TabsContent value="share-transfer" className="space-y-4">
        <ShareTransferManager />
      </TabsContent>
    </Tabs>
  );
};

export default OrderManagementSection;