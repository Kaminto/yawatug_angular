import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Shield, TrendingUp, Users } from 'lucide-react';
import MarketStateManager from './MarketStateManager';
import AutoBuybackSettings from './AutoBuybackSettings';
import PriceFluctuationControls from './PriceFluctuationControls';
import LargeHolderManagement from './LargeHolderManagement';

const MarketStateManagementPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('state');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Market State Management
          </CardTitle>
          <CardDescription>
            Control market behavior, trading rules, and automated systems for the startup phase
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="state" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Market State
          </TabsTrigger>
          <TabsTrigger value="buyback" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Auto-Buyback
          </TabsTrigger>
          <TabsTrigger value="price" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Price Controls
          </TabsTrigger>
          <TabsTrigger value="holders" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Large Holders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="state" className="space-y-6">
          <MarketStateManager />
        </TabsContent>

        <TabsContent value="buyback" className="space-y-6">
          <AutoBuybackSettings />
        </TabsContent>

        <TabsContent value="price" className="space-y-6">
          <PriceFluctuationControls />
        </TabsContent>

        <TabsContent value="holders" className="space-y-6">
          <LargeHolderManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketStateManagementPanel;