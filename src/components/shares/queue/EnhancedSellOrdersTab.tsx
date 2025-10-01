import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import EnhancedUserShareSelling from '../EnhancedUserShareSelling';
import UserSellQueueDashboard from './UserSellQueueDashboard';
import { TrendingDown, Clock } from 'lucide-react';

interface EnhancedSellOrdersTabProps {
  userHoldings: any[];
  userId: string;
  onSellComplete: () => void;
}

const EnhancedSellOrdersTab: React.FC<EnhancedSellOrdersTabProps> = ({
  userHoldings,
  userId,
  onSellComplete
}) => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('sell');
  const [refreshKey, setRefreshKey] = useState(0);

  const tabConfig = [
    { value: 'sell', label: 'Create Sell Order', icon: TrendingDown },
    { value: 'queue', label: 'My Queue', icon: Clock }
  ];

  const handleSellComplete = () => {
    onSellComplete();
    setRefreshKey((k) => k + 1);
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      {isMobile ? (
        <div className="mb-6">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {(() => {
                  const currentTab = tabConfig.find(tab => tab.value === activeTab);
                  const Icon = currentTab?.icon;
                  return (
                    <div className="flex items-center gap-2">
                      {Icon && <Icon className="h-4 w-4" />}
                      <span>{currentTab?.label || 'Select Option'}</span>
                    </div>
                  );
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {tabConfig.map((tab) => {
                const Icon = tab.icon;
                return (
                  <SelectItem key={tab.value} value={tab.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <TabsList className="grid w-full grid-cols-2">
          {tabConfig.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      )}
      
      <TabsContent value="sell" className="mt-6 space-y-6">
        <EnhancedUserShareSelling 
          userHoldings={userHoldings}
          userId={userId}
          onSellComplete={handleSellComplete}
        />
        {/* Inline Active Orders with management controls (recent 5 + Show More) */}
        <UserSellQueueDashboard key={refreshKey} userId={userId} />
      </TabsContent>
      
      <TabsContent value="queue" className="mt-6">
        <UserSellQueueDashboard userId={userId} />
      </TabsContent>
    </Tabs>
  );
};

export default EnhancedSellOrdersTab;