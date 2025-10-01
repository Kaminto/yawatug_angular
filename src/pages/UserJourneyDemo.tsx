import React, { useState } from 'react';
import { UserLayout } from '@/components/layout/UserLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import UserJourneySimulator from '@/components/demo/UserJourneySimulator';
import DemoSystemEvaluation from '@/components/demo/DemoSystemEvaluation';
import InteractiveDemoJourney from '@/components/demo/InteractiveDemoJourney';
import MobileQuickDemo from '@/components/demo/MobileQuickDemo';
import { Smartphone, Monitor, Settings, Zap } from 'lucide-react';

const UserJourneyDemo = () => {
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Demo Journey' }
  ];

  return (
    <UserLayout title="Demo Experience Center" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Experience Yawatu</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover how easy it is to start investing with Yawatu through our interactive demos.
            Choose the experience that suits you best.
          </p>
        </div>
        
        <Tabs defaultValue="interactive" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="interactive" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <span className="hidden sm:inline">Interactive</span>
            </TabsTrigger>
            <TabsTrigger value="quick" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">60-Second</span>
            </TabsTrigger>
            <TabsTrigger value="technical" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">Technical</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">System</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="interactive" className="mt-6">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Interactive User Journey
                </CardTitle>
                <CardDescription>
                  Step through a personalized demo based on your user type. Perfect for understanding 
                  how Yawatu fits into your life.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InteractiveDemoJourney />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quick" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Zap className="h-5 w-5" />
                    60-Second Mobile Demo
                  </CardTitle>
                  <CardDescription>
                    See the power of mobile investing in just one minute. Perfect for busy people 
                    who want to understand the basics quickly.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MobileQuickDemo />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Why Choose Mobile-First Investing?</CardTitle>
                  <CardDescription>
                    See why thousands of Ugandans prefer investing on their phones
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Smartphone className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Always Available</h4>
                        <p className="text-sm text-muted-foreground">
                          Invest, check balances, and track growth anytime, anywhere
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Zap className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Instant Transactions</h4>
                        <p className="text-sm text-muted-foreground">
                          Mobile Money integration means instant deposits and withdrawals
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Monitor className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Simple Interface</h4>
                        <p className="text-sm text-muted-foreground">
                          Designed for Ugandans by Ugandans - easy to understand and use
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary mb-1">5,000+</div>
                      <div className="text-sm text-muted-foreground">
                        Ugandans already investing on mobile
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="technical" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Technical Deep Dive
                </CardTitle>
                <CardDescription>
                  Comprehensive simulation showing all platform features and capabilities.
                  Includes real database operations and detailed reporting.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserJourneySimulator />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Evaluation
                </CardTitle>
                <CardDescription>
                  Technical evaluation of platform completeness and feature implementation status.
                  Useful for developers and technical stakeholders.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DemoSystemEvaluation />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </UserLayout>
  );
};

export default UserJourneyDemo;