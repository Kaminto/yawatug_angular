import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import EnhancedSharePoolOverview from '../EnhancedSharePoolOverview';
import ShareCreationManager from '../ShareCreationManager';
import SharePoolCreation from '../SharePoolCreation';
import EnhancedIssueManager from '../EnhancedIssueManager';
import EnhancedDividendManager from '../EnhancedDividendManager';

interface ShareData {
  id: string;
  name: string;
  price_per_share: number;
  available_shares: number;
  total_shares: number;
  currency: string;
  share_type?: string;
  share_category?: string;
  minimum_investment?: number;
  maximum_individual_holding?: number;
  voting_rights?: boolean;
  dividend_eligible?: boolean;
  transfer_restrictions?: any;
  [key: string]: any;
}

interface SharePoolSectionProps {
  shareData: ShareData | null;
  loading: boolean;
  refresh: () => void;
  onNavigate: (tab: string) => void;
  activeSubTab: string;
  onSubTabChange: (tab: string) => void;
}

const SharePoolSection: React.FC<SharePoolSectionProps> = ({
  shareData,
  loading,
  refresh,
  onNavigate,
  activeSubTab,
  onSubTabChange
}) => {
  const getTabBadge = (tab: string) => {
    if (!shareData) return null;
    
    switch (tab) {
      case 'overview':
        return shareData.available_shares < 1000 ? (
          <Badge variant="destructive" className="ml-2">Low Stock</Badge>
        ) : null;
      case 'issue':
        return <Badge variant="secondary" className="ml-2">Reserves</Badge>;
      case 'dividends':
        return <Badge variant="secondary" className="ml-2">3 Pending</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-muted-foreground">Loading share data...</span>
      </div>
    );
  }

  return (
    <Tabs value={activeSubTab} onValueChange={onSubTabChange} className="space-y-4">
      <TabsList className="grid grid-cols-4 w-full">
        <TabsTrigger value="overview" className="flex items-center">
          Overview
          {getTabBadge('overview')}
        </TabsTrigger>
        <TabsTrigger value="creation" className="flex items-center">
          Creation
        </TabsTrigger>
        <TabsTrigger value="issue" className="flex items-center">
          Issue
          {getTabBadge('issue')}
        </TabsTrigger>
        <TabsTrigger value="dividends" className="flex items-center">
          Dividends
          {getTabBadge('dividends')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        {shareData ? (
          <EnhancedSharePoolOverview 
            shareData={shareData} 
            onUpdate={refresh}
            onNavigate={onNavigate} 
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Failed to load share data</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="creation" className="space-y-4">
        {shareData ? (
          <ShareCreationManager 
            shareData={shareData} 
            onUpdate={refresh}
          />
        ) : (
          <SharePoolCreation onSuccess={refresh} />
        )}
      </TabsContent>

      <TabsContent value="issue" className="space-y-4">
        {shareData && (
          <EnhancedIssueManager 
            shareData={shareData} 
            onUpdate={refresh}
          />
        )}
      </TabsContent>

      <TabsContent value="dividends" className="space-y-4">
        {shareData ? (
          <EnhancedDividendManager 
            shareData={shareData}
            onUpdate={async () => refresh()}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Share data required for dividend management</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default SharePoolSection;
