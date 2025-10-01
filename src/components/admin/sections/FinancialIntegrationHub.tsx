import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Wallet, 
  TrendingUp, 
  Eye, 
  Shield,
  DollarSign
} from 'lucide-react';

// Import wallet dashboard component
import EnhancedWalletDashboard from '@/components/admin/wallet/EnhancedWalletDashboard';
import ClubShareAllocationManager from './ClubShareAllocationManager';

const FinancialIntegrationHub = () => {
  const [activeSection, setActiveSection] = useState('balances');

  // Mock notification counts - would come from real data
  const sectionCounts = {
    balances: 4999,
    approvals: 7,
    allocations: 12,
    monitoring: 3,
    compliance: 5
  };

  const sections = [
    {
      id: 'balances',
      label: 'Opening Balances',
      icon: DollarSign,
      description: 'Imported users with pre-existing funds',
      count: sectionCounts.balances,
      variant: 'default' as const
    },
    {
      id: 'approvals',
      label: 'Wallet Approvals',
      icon: Wallet,
      description: 'Deposit/withdrawal requests',
      count: sectionCounts.approvals,
      variant: 'secondary' as const
    },
    {
      id: 'allocations',
      label: 'Share Allocations',
      icon: TrendingUp,
      description: 'Club member share assignments',
      count: sectionCounts.allocations,
      variant: 'default' as const
    },
    {
      id: 'monitoring',
      label: 'Transaction Monitoring',
      icon: Eye,
      description: 'High-value or suspicious activity',
      count: sectionCounts.monitoring,
      variant: 'destructive' as const
    },
    {
      id: 'compliance',
      label: 'Compliance Tracking',
      icon: Shield,
      description: 'AML/KYC requirements',
      count: sectionCounts.compliance,
      variant: 'default' as const
    }
  ];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <CreditCard className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Financial Integration Hub</h2>
          <p className="text-muted-foreground">Manage users with financial implications and requirements</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
        <TabsList className="grid grid-cols-2 lg:grid-cols-5 w-full h-auto p-1">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className="flex flex-col items-center gap-2 p-4 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {section.count > 0 && (
                    <Badge variant={section.variant} className="px-1.5 py-0.5 text-xs">
                      {section.count}
                    </Badge>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">{section.label}</div>
                  <div className="text-xs text-muted-foreground hidden lg:block">
                    {section.description}
                  </div>
                </div>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Section Content */}
        <div className="mt-6">
          <TabsContent value="balances" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Opening Balances ({sectionCounts.balances.toLocaleString()})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Imported users with pre-existing share and fund balances requiring validation.
                </p>
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Opening balances management component will be implemented here</p>
                  <p className="text-sm">Review and validate imported user financial data</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approvals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Wallet Approvals ({sectionCounts.approvals})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  Review and approve user deposit and withdrawal requests.
                </p>
                <EnhancedWalletDashboard />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="allocations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Share Allocations ({sectionCounts.allocations})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  Manage club member share assignments and allocations.
                </p>
                <ClubShareAllocationManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Transaction Monitoring ({sectionCounts.monitoring})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Monitor high-value or suspicious transaction activity.
                </p>
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Transaction monitoring component will be implemented here</p>
                  <p className="text-sm">Track unusual patterns and high-value transactions</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Compliance Tracking ({sectionCounts.compliance})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Monitor AML/KYC compliance requirements and status.
                </p>
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Compliance tracking component will be implemented here</p>
                  <p className="text-sm">Ensure regulatory compliance for all financial activities</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default FinancialIntegrationHub;