import React from 'react';
import { UnifiedLayout } from '@/components/layout/UnifiedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowRight, GitBranch, Bug } from 'lucide-react';
import { Link } from 'react-router-dom';

const TradingPathwayComparison = () => {
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Developer Tools', href: '/developer' },
    { label: 'Trading Pathways' }
  ];

  return (
    <UnifiedLayout 
      title="Trading Pathway Comparison" 
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Trading Pathway Comparison</h1>
            <p className="text-muted-foreground">
              Compare the two different trading implementations to debug trade limits
            </p>
          </div>
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            <Bug className="h-4 w-4 mr-1" />
            Debug Mode
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Old Pathway */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Legacy Pathway
                <Badge variant="secondary">EnhancedUserShares</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Component Flow:</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <span>EnhancedUserShares.tsx</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span>UserSharePurchaseTab</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                  <div className="flex items-center gap-2 ml-8">
                    <span>EnhancedSharePurchaseFlow</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Issues:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Direct wrapper to EnhancedSharePurchaseFlow</li>
                  <li>• May have stale data issues</li>
                  <li>• Simple tab-based interface</li>
                </ul>
              </div>

              <Button asChild className="w-full">
                <Link to="/user-shares">
                  Test Enhanced Trading
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* New Pathway */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                New Pathway
                <Badge variant="default">EnhancedUserShares</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Component Flow:</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <span>EnhancedUserShares.tsx</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span>UserTradingHub</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                  <div className="flex items-center gap-2 ml-8">
                    <span>EnhancedTradingHub</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                  <div className="flex items-center gap-2 ml-12">
                    <span>EnhancedSharePurchaseFlow</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Features:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Enhanced trading interface</li>
                  <li>• Better state management</li>
                  <li>• Market depth indicators</li>
                  <li>• Comprehensive dashboard</li>
                </ul>
              </div>

              <Button asChild className="w-full">
                <Link to="/developer/new-trading">
                  Test New Pathway
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="comparison" className="w-full">
              <TabsList>
                <TabsTrigger value="comparison">Side-by-Side</TabsTrigger>
                <TabsTrigger value="issues">Known Issues</TabsTrigger>
                <TabsTrigger value="solution">Proposed Solution</TabsTrigger>
              </TabsList>
              
              <TabsContent value="comparison" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Legacy Issues:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Shows incorrect trade limits</li>
                      <li>• Portfolio stats show 2856 shares</li>
                      <li>• Available calculation may be wrong</li>
                      <li>• Simple wrapper component</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">New Pathway Benefits:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• More comprehensive data loading</li>
                      <li>• Better error handling</li>
                      <li>• Enhanced UI components</li>
                      <li>• Unified trading interface</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="issues" className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="font-semibold text-red-800">Critical Issue:</h4>
                    <p className="text-sm text-red-700">Trade limits calculation: Available = min(pool_available, max_limit - owned_shares - pending_orders)</p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h4 className="font-semibold text-yellow-800">Data Inconsistency:</h4>
                    <p className="text-sm text-yellow-700">Portfolio shows 2856 shares but purchase flow shows different values</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="solution" className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-semibold">Recommended Actions:</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Remove UserSharePurchaseTab wrapper</li>
                    <li>Consolidate all trading through EnhancedTradingHub</li>
                    <li>Fix trade limits formula implementation</li>
                    <li>Ensure data consistency across components</li>
                    <li>Test both pathways side by side</li>
                  </ol>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </UnifiedLayout>
  );
};

export default TradingPathwayComparison;