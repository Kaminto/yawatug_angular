import React, { useState, useEffect } from 'react';
import { UserLayout } from '@/components/layout/UserLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AgentApplication from '@/components/agent/AgentApplication';
import { Users, DollarSign, TrendingUp, UserPlus } from 'lucide-react';
import { AgentIncomeOverview } from '@/components/agent/AgentIncomeOverview';
import { AgentTierBadge } from '@/components/agent/AgentTierBadge';
import { AgentIncomeHistory } from '@/components/agent/AgentIncomeHistory';
import { AgentClientsList } from '@/components/agent/AgentClientsList';

const UserAgent = () => {
  const [agentData, setAgentData] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasApplication, setHasApplication] = useState(false);

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Agent Program' }
  ];

  useEffect(() => {
    loadAgentData();
  }, []);

  const loadAgentData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is already an agent
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (agent) {
        setAgentData(agent);
        
        // Load agent clients
        const { data: clientsData, error: clientsError } = await supabase
          .from('agent_clients')
          .select(`
            *,
            profiles:client_id (
              full_name,
              email
            )
          `)
          .eq('agent_id', agent.id);

        if (!clientsError) {
          setClients(clientsData || []);
        }

        // Load commissions
        const { data: commissionsData, error: commissionsError } = await supabase
          .from('agent_commissions')
          .select('*')
          .eq('agent_id', agent.id)
          .order('created_at', { ascending: false });

        if (!commissionsError) {
          setCommissions(commissionsData || []);
        }
      } else {
        // Check if user has pending application
        const { data: application } = await supabase
          .from('agent_applications')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        setHasApplication(!!application);
      }

    } catch (error) {
      console.error('Error loading agent data:', error);
      toast.error('Failed to load agent data');
    } finally {
      setLoading(false);
    }
  };

  const totalEarnings = commissions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + c.commission_amount, 0);

  const pendingEarnings = commissions
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + c.commission_amount, 0);

  if (loading) {
    return (
      <UserLayout title="Agent Program" breadcrumbs={breadcrumbs}>
        <div className="animate-pulse">Loading agent data...</div>
      </UserLayout>
    );
  }

  if (!agentData && !hasApplication) {
    return (
      <UserLayout title="Become a Yawatu Agent" breadcrumbs={breadcrumbs}>
        <div className="space-y-8">
          <div>
            <p className="text-muted-foreground">
              Join our agent network and earn commissions by helping others invest in gold mining shares
            </p>
          </div>
          <AgentApplication onSubmit={loadAgentData} />
        </div>
      </UserLayout>
    );
  }

  if (!agentData && hasApplication) {
    return (
      <UserLayout title="Application Submitted" breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          <div>
            <p className="text-muted-foreground">
              Your agent application is under review. We'll notify you once it's processed.
            </p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-2">
                <Badge variant="secondary">Application Pending</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout title="Agent Dashboard" breadcrumbs={breadcrumbs}>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">Agent Code: {agentData?.agent_code}</p>
          </div>
          {agentData?.tier && (
            <AgentTierBadge tier={agentData.tier} />
          )}
        </div>

        {/* Enhanced Income Overview */}
        <AgentIncomeOverview agentId={agentData?.id} />

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Income Overview</TabsTrigger>
            <TabsTrigger value="clients">My Clients</TabsTrigger>
            <TabsTrigger value="history">Income History</TabsTrigger>
            <TabsTrigger value="legacy">Legacy View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <AgentIncomeOverview agentId={agentData?.id} />
          </TabsContent>
          
          <TabsContent value="clients">
            <AgentClientsList agentId={agentData?.id} />
          </TabsContent>
          
          <TabsContent value="history">
            <AgentIncomeHistory agentId={agentData?.id} />
          </TabsContent>

          <TabsContent value="legacy">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{clients.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Legacy Earnings</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">UGX {totalEarnings.toLocaleString()}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Earnings</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">UGX {pendingEarnings.toLocaleString()}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(agentData?.commission_rate * 100).toFixed(1)}%</div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="legacy-clients" className="space-y-4">
              <TabsList>
                <TabsTrigger value="legacy-clients">Legacy Clients</TabsTrigger>
                <TabsTrigger value="legacy-commissions">Legacy Commissions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="legacy-clients">
                <Card>
                  <CardHeader>
                    <CardTitle>Legacy Client List</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {clients.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No clients yet</p>
                    ) : (
                      <div className="space-y-4">
                        {clients.map((client) => (
                          <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">{client.profiles?.full_name}</p>
                              <p className="text-sm text-muted-foreground">{client.profiles?.email}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                                {client.status}
                              </Badge>
                              <p className="text-sm text-muted-foreground">
                                Joined {new Date(client.onboarded_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="legacy-commissions">
                <Card>
                  <CardHeader>
                    <CardTitle>Legacy Commission History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {commissions.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No commissions yet</p>
                    ) : (
                      <div className="space-y-4">
                        {commissions.map((commission) => (
                          <div key={commission.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">Commission from Transaction</p>
                              <p className="text-sm text-muted-foreground">
                                Transaction Amount: UGX {commission.transaction_amount.toLocaleString()}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(commission.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">UGX {commission.commission_amount.toLocaleString()}</p>
                              <Badge variant={commission.status === 'paid' ? 'default' : 'secondary'}>
                                {commission.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </UserLayout>
  );
};

export default UserAgent;
