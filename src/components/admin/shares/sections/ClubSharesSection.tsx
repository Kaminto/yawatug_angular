import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import ConsentManagement from '../../club/ConsentManagement';
import ClubShareAllocationImporter from '../../club/ClubShareAllocationImporter';

interface ClubSharesSectionProps {
  activeSubTab: string;
  onSubTabChange: (tab: string) => void;
}

const ClubSharesSection: React.FC<ClubSharesSectionProps> = ({
  activeSubTab,
  onSubTabChange
}) => {
  const getTabBadge = (tab: string) => {
    switch (tab) {
      case 'consent-management':
        return <Badge variant="secondary" className="ml-2">15 Pending</Badge>;
      case 'share-release':
        return <Badge variant="secondary" className="ml-2">3 Ready</Badge>;
      case 'import-batch':
        return <Badge variant="secondary" className="ml-2">2 Active</Badge>;
      default:
        return null;
    }
  };

  const handleImportComplete = () => {
    // Refresh data if needed
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={onSubTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="consent-management">
            Consent Management
            {getTabBadge('consent-management')}
          </TabsTrigger>
          <TabsTrigger value="share-release">
            Share Release
            {getTabBadge('share-release')}
          </TabsTrigger>
          <TabsTrigger value="import-batch">
            Import & Batch
            {getTabBadge('import-batch')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consent-management">
          <ConsentManagement />
        </TabsContent>

        <TabsContent value="share-release">
          <div className="p-6 text-center text-muted-foreground">
            Share Release functionality coming soon...
          </div>
        </TabsContent>

        <TabsContent value="import-batch">
          <ClubShareAllocationImporter onImportComplete={handleImportComplete} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClubSharesSection;