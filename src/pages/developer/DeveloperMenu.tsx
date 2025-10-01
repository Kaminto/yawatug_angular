import React from 'react';
import { UnifiedLayout } from '@/components/layout/UnifiedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GitBranch, Bug, Settings, Database, Network } from 'lucide-react';
import { Link } from 'react-router-dom';

const DeveloperMenu = () => {
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Developer Tools' }
  ];

  return (
    <UnifiedLayout 
      title="Developer Tools" 
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Developer Tools & Debug Center</h1>
            <p className="text-muted-foreground">
              Tools for debugging and comparing different implementations
            </p>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Settings className="h-4 w-4 mr-1" />
            Debug Mode
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Trading Pathways Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Trading Pathways
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Compare legacy vs enhanced trading implementations to debug trade limits issues.
              </p>
              <div className="space-y-2">
                <Badge variant="secondary" className="text-xs">Legacy: EnhancedUserShares</Badge>
                <Badge variant="secondary" className="text-xs">Enhanced: EnhancedUserShares</Badge>
              </div>
              <Button asChild className="w-full">
                <Link to="/developer/trading-comparison">
                  Compare Pathways
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Database Debug */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Debug
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Debug database queries, check data consistency, and verify trade calculations.
              </p>
              <div className="space-y-2">
                <Badge variant="outline" className="text-xs">user_shares</Badge>
                <Badge variant="outline" className="text-xs">share_transactions</Badge>
                <Badge variant="outline" className="text-xs">share_buying_limits</Badge>
              </div>
              <Button variant="outline" className="w-full" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          {/* Network Monitor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Network Monitor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Monitor API calls, response times, and network errors in real-time.
              </p>
              <div className="space-y-2">
                <Badge variant="outline" className="text-xs">Supabase Queries</Badge>
                <Badge variant="outline" className="text-xs">Response Times</Badge>
              </div>
              <Button variant="outline" className="w-full" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Current Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-800 mb-2">Trade Limits Bug</h4>
                <p className="text-sm text-red-700 mb-3">
                  Available shares calculation is incorrect. Should be: min(pool_available, max_limit - owned_shares - pending_orders)
                </p>
                <div className="space-y-1 text-xs">
                  <div>• Portfolio shows 2856 shares owned</div>
                  <div>• Purchase flow shows different values</div>
                  <div>• Need to debug data consistency</div>
                </div>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-semibold text-green-800 mb-2">✅ Consolidated</h4>
                <p className="text-sm text-green-700 mb-3">
                  Trading pathways have been unified for consistency
                </p>
              <div className="space-y-1 text-xs text-green-600">
                <div>✓ Consolidated through EnhancedTradingHub</div>
                <div>✓ Unified data flow and state management</div>
                <div>✓ Consistent trade limits calculation</div>
                <div>✓ Better maintainability</div>
              </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </UnifiedLayout>
  );
};

export default DeveloperMenu;