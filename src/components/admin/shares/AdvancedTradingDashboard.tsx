
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Shield, ArrowRight, Zap } from 'lucide-react';
import RealTimeShareMonitor from './RealTimeShareMonitor';
import AdvancedTradingLimits from './AdvancedTradingLimits';
import ShareTransferManager from './ShareTransferManager';
import { ShareData } from '@/types/custom';

interface AdvancedTradingDashboardProps {
  shareData: ShareData;
  onUpdate: () => void;
}

const AdvancedTradingDashboard: React.FC<AdvancedTradingDashboardProps> = ({ shareData, onUpdate }) => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="monitor" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="monitor" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Real-Time Monitor
          </TabsTrigger>
          <TabsTrigger value="limits" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Trading Rules
          </TabsTrigger>
          <TabsTrigger value="triggers" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Auto Triggers
          </TabsTrigger>
          <TabsTrigger value="transfers" className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            Transfers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitor" className="space-y-6">
          <RealTimeShareMonitor shareData={shareData} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="limits" className="space-y-6">
          <AdvancedTradingLimits />
        </TabsContent>

        <TabsContent value="triggers" className="space-y-6">
          <AdvancedTradingLimits />
        </TabsContent>

        <TabsContent value="transfers" className="space-y-6">
          <ShareTransferManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedTradingDashboard;
