import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, DollarSign, Target, Share2, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';

interface UnifiedBusinessHubProps {
  userId: string;
  referralStats?: {
    totalReferrals: number;
    activeReferrals: number;
    totalCommissions: number;
    pendingCommissions: number;
  };
  agentStats?: {
    totalClients: number;
    activeClients: number;
    totalEarnings: number;
    monthlyEarnings: number;
  };
  isAgent?: boolean;
}

const UnifiedBusinessHub: React.FC<UnifiedBusinessHubProps> = ({
  userId,
  referralStats,
  agentStats,
  isAgent = false
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const totalEarnings = (referralStats?.totalCommissions || 0) + (agentStats?.totalEarnings || 0);
  const totalClients = (referralStats?.totalReferrals || 0) + (agentStats?.totalClients || 0);

  return (
    <div className="space-y-4">
      {/* Business Overview Header */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Business Hub</CardTitle>
                <CardDescription>Your earning opportunities in one place</CardDescription>
              </div>
            </div>
            {isAgent && (
              <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                Agent Status
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Earnings */}
            <div className="p-4 rounded-xl border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="text-sm text-muted-foreground">Total Earnings</span>
              </div>
              <p className="text-2xl font-bold">UGX {totalEarnings.toLocaleString()}</p>
            </div>

            {/* Total Clients/Referrals */}
            <div className="p-4 rounded-xl border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-sm text-muted-foreground">Total Network</span>
              </div>
              <p className="text-2xl font-bold">{totalClients}</p>
            </div>

            {/* Growth Rate */}
            <div className="p-4 rounded-xl border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                <span className="text-sm text-muted-foreground">This Month</span>
              </div>
              <p className="text-2xl font-bold">UGX {(agentStats?.monthlyEarnings || 0).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="referrals">
            <Share2 className="h-4 w-4 mr-2" />
            Referrals
          </TabsTrigger>
          {isAgent && (
            <TabsTrigger value="agent">
              <Briefcase className="h-4 w-4 mr-2" />
              Agent
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Referral Program Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Referral Program</CardTitle>
                </div>
                <CardDescription>Earn 5% on every referral purchase</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Referrals</span>
                  <span className="font-bold">{referralStats?.totalReferrals || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Commissions Earned</span>
                  <span className="font-bold text-green-600">
                    UGX {(referralStats?.totalCommissions || 0).toLocaleString()}
                  </span>
                </div>
                <Button asChild className="w-full" size="sm">
                  <Link to="/referrals">
                    <Target className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Agent Program Card */}
            {isAgent ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-purple-600" />
                    <CardTitle className="text-lg">Agent Program</CardTitle>
                  </div>
                  <CardDescription>Manage clients and track performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active Clients</span>
                    <span className="font-bold">{agentStats?.activeClients || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Earnings</span>
                    <span className="font-bold text-green-600">
                      UGX {(agentStats?.totalEarnings || 0).toLocaleString()}
                    </span>
                  </div>
                  <Button asChild className="w-full" size="sm">
                    <Link to="/agent">
                      <Briefcase className="h-4 w-4 mr-2" />
                      Agent Dashboard
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Become an Agent</CardTitle>
                  </div>
                  <CardDescription>Unlock higher earning potential</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Agents earn higher commissions and can manage multiple clients.
                  </p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>✓ Higher commission rates</li>
                    <li>✓ Client management tools</li>
                    <li>✓ Performance analytics</li>
                    <li>✓ Priority support</li>
                  </ul>
                  <Button asChild className="w-full" size="sm" variant="outline">
                    <Link to="/agent">
                      <Target className="h-4 w-4 mr-2" />
                      Learn More
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="referrals">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Share2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">View detailed referral analytics and manage your network</p>
                <Button asChild>
                  <Link to="/referrals">Go to Referrals</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAgent && (
          <TabsContent value="agent">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">Access your full agent dashboard with client management</p>
                  <Button asChild>
                    <Link to="/agent">Go to Agent Dashboard</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default UnifiedBusinessHub;
