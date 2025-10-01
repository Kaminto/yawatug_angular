import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, TrendingUp, Users } from 'lucide-react';
import EnhancedShareBuyingLimits from './EnhancedShareBuyingLimits';
import AccountBasedSellingLimits from './AccountBasedSellingLimits';
import AccountBasedTransferLimits from './AccountBasedTransferLimits';

const TradeControlsPanel: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Trade Controls & Limits
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="buying-limits" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="buying-limits" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Buying Limits
            </TabsTrigger>
            <TabsTrigger value="selling-limits" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Selling Limits
            </TabsTrigger>
            <TabsTrigger value="transfer-limits" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Transfer Limits
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="buying-limits" className="mt-4">
            <EnhancedShareBuyingLimits />
          </TabsContent>
          
          <TabsContent value="selling-limits" className="mt-4">
            <AccountBasedSellingLimits />
          </TabsContent>
          
          <TabsContent value="transfer-limits" className="mt-4">
            <AccountBasedTransferLimits />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TradeControlsPanel;