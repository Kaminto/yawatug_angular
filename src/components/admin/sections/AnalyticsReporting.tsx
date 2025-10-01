import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Shield,
  Clock
} from 'lucide-react';

const AnalyticsReporting = () => {
  const [activeSection, setActiveSection] = useState('growth');

  const sections = [
    {
      id: 'growth',
      label: 'User Growth',
      icon: TrendingUp,
      description: 'Registration vs activation trends',
      variant: 'default' as const
    },
    {
      id: 'verification',
      label: 'Verification Performance',
      icon: Clock,
      description: 'Processing times & success rates',
      variant: 'default' as const
    },
    {
      id: 'financial',
      label: 'Financial Metrics',
      icon: DollarSign,
      description: 'Wallet values & transaction volumes',
      variant: 'default' as const
    },
    {
      id: 'risk',
      label: 'Risk Analysis',
      icon: Shield,
      description: 'User risk distribution & fraud detection',
      variant: 'default' as const
    },
    {
      id: 'operational',
      label: 'Operational Efficiency',
      icon: Users,
      description: 'Response times & bottlenecks',
      variant: 'default' as const
    }
  ];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Analytics & Reporting</h2>
          <p className="text-muted-foreground">Strategic insights and performance monitoring</p>
        </div>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium">Registration Rate</div>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+12.5%</div>
            <p className="text-xs text-muted-foreground">vs last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium">Verification Time</div>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">18h</div>
            <p className="text-xs text-muted-foreground">average processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium">Success Rate</div>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">94.2%</div>
            <p className="text-xs text-muted-foreground">verification success</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium">Risk Score</div>
            <Shield className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">2.1%</div>
            <p className="text-xs text-muted-foreground">high-risk users</p>
          </CardContent>
        </Card>
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
                <Icon className="h-4 w-4" />
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
          <TabsContent value="growth" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  User Growth Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Analyze registration patterns, activation rates, and user growth over time.
                </p>
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>User growth analytics component will be implemented here</p>
                  <p className="text-sm">Charts showing registration vs activation trends</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verification" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Verification Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Monitor verification processing times, success rates, and bottlenecks.
                </p>
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Verification performance analytics component will be implemented here</p>
                  <p className="text-sm">Processing time trends and success rate analysis</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Track wallet values, transaction volumes, and financial activity patterns.
                </p>
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Financial metrics analytics component will be implemented here</p>
                  <p className="text-sm">Transaction volumes and wallet balance trends</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risk" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Risk Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Monitor user risk distribution, fraud detection, and security patterns.
                </p>
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Risk analysis component will be implemented here</p>
                  <p className="text-sm">User risk scores and fraud detection metrics</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operational" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Operational Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Analyze admin response times, workflow bottlenecks, and system efficiency.
                </p>
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Operational efficiency analytics component will be implemented here</p>
                  <p className="text-sm">Admin performance and workflow optimization metrics</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default AnalyticsReporting;