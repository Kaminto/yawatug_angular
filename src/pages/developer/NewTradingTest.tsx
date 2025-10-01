import React from 'react';
import { UnifiedLayout } from '@/components/layout/UnifiedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import EnhancedUserShares from '@/pages/EnhancedUserShares';
import { Zap } from 'lucide-react';

const NewTradingTest = () => {
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Developer Tools', href: '/developer' },
    { label: 'Trading Pathways', href: '/developer/trading-comparison' },
    { label: 'New Test' }
  ];

  return (
    <UnifiedLayout 
      title="New Trading Pathway Test" 
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">New Trading Test</h1>
            <p className="text-muted-foreground">
              Testing the enhanced EnhancedUserShares share trading system
            </p>
          </div>
          <Badge variant="default">
            <Zap className="h-4 w-4 mr-1" />
            Enhanced
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Component Path Debug</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline">1</Badge>
                <span>EnhancedUserShares.tsx</span>
              </div>
              <div className="flex items-center gap-2 ml-6">
                <Badge variant="outline">2</Badge>
                <span>UserTradingHub</span>
              </div>
              <div className="flex items-center gap-2 ml-12">
                <Badge variant="outline">3</Badge>
                <span>EnhancedTradingHub</span>
              </div>
              <div className="flex items-center gap-2 ml-18">
                <Badge variant="outline">4</Badge>
                <span>EnhancedSharePurchaseFlow</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Render the new component */}
        <div className="border-2 border-dashed border-green-300 p-4 rounded-lg bg-green-50/30">
          <div className="mb-4">
            <Badge variant="outline" className="bg-green-100 text-green-800">
              Enhanced Component Below
            </Badge>
          </div>
          <EnhancedUserShares />
        </div>
      </div>
    </UnifiedLayout>
  );
};

export default NewTradingTest;