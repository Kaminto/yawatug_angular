import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, DollarSign, TrendingUp, UserPlus, Check, X, Eye, Wallet } from 'lucide-react';
import { UnifiedLayout } from '@/components/layout/UnifiedLayout';
import { useAgentData } from '@/hooks/useAgentData';
import { AgentApplicationDialog } from '@/components/admin/agents/AgentApplicationDialog';
import { AgentCommissionPayoutDialog } from '@/components/admin/agents/AgentCommissionPayoutDialog';

const AdminAgent = () => {
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  
  const {
    applications,
    agents,
    commissions,
    stats,
    loading,
    error,
    approveApplication,
    rejectApplication,
    updateAgentStatus: updateStatus
  } = useAgentData();

  const handleApplicationAction = async (applicationId: string, action: 'approved' | 'rejected') => {
    try {
      if (action === 'approved') {
        await approveApplication(applicationId);
      } else {
        await rejectApplication(applicationId);
      }
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleStatusChange = async (agentId: string, status: string) => {
    try {
      await updateStatus(agentId, status);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  if (loading) {
    return (
      <UnifiedLayout title="Agent Management">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse">Loading agent data...</div>
        </div>
      </UnifiedLayout>
    );
  }

  if (error) {
    return (
      <UnifiedLayout title="Agent Management">
        <div className="flex items-center justify-center h-64">
          <div className="text-destructive">Error: {error}</div>
        </div>
      </UnifiedLayout>
    );
  }

  return (
    <UnifiedLayout title="Agent Management">
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground">Manage agent applications and performance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAgents}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingApplications}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">UGX {stats.totalCommissions.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClients}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="applications" className="space-y-4">
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="applications">
              <span className="hidden sm:inline">Applications</span>
              <span className="sm:hidden">Apps</span>
            </TabsTrigger>
            <TabsTrigger value="agents">
              <span className="hidden sm:inline">Active Agents</span>
              <span className="sm:hidden">Agents</span>
            </TabsTrigger>
            <TabsTrigger value="commissions">
              <span className="hidden sm:inline">Commissions</span>
              <span className="sm:hidden">Pay</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle>Agent Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Expected Customers</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((application) => (
                      <TableRow key={application.id}>
                        <TableCell className="font-medium">
                          {application.profiles?.full_name}
                        </TableCell>
                        <TableCell>{application.profiles?.email}</TableCell>
                        <TableCell>{application.location}</TableCell>
                        <TableCell>{application.expected_customers}</TableCell>
                        <TableCell>
                          <Badge variant={application.status === 'pending' ? 'secondary' : 
                                       application.status === 'approved' ? 'default' : 'destructive'}>
                            {application.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedApplication(application);
                                setDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {application.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleApplicationAction(application.id, 'approved')}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleApplicationAction(application.id, 'rejected')}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          
          <TabsContent value="agents">
            <Card>
              <CardHeader>
                <CardTitle>Active Agents</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Agent Code</TableHead>
                      <TableHead>Commission Rate</TableHead>
                      <TableHead>Total Earnings</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell className="font-medium">
                          {agent.profiles?.full_name}
                        </TableCell>
                        <TableCell>{agent.profiles?.email}</TableCell>
                        <TableCell>{agent.agent_code}</TableCell>
                        <TableCell>{(agent.commission_rate * 100).toFixed(1)}%</TableCell>
                        <TableCell>UGX {agent.total_earnings?.toLocaleString() || '0'}</TableCell>
                        <TableCell>
                          <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                            {agent.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Select 
                              value={agent.status} 
                              onValueChange={(value) => handleStatusChange(agent.id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedAgent(agent);
                                setPayoutDialogOpen(true);
                              }}
                            >
                              <Wallet className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="commissions">
            <Card>
              <CardHeader>
                <CardTitle>Commission History</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Transaction Amount</TableHead>
                      <TableHead>Commission Rate</TableHead>
                      <TableHead>Commission Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map((commission) => (
                      <TableRow key={commission.id}>
                        <TableCell>
                          {new Date(commission.created_at).toLocaleDateString()}
                        </TableCell>
                         <TableCell>
                           {commission.agents?.profiles?.full_name || `Agent #${commission.agent_id.slice(0, 8)}`}
                         </TableCell>
                        <TableCell>UGX {commission.transaction_amount.toLocaleString()}</TableCell>
                        <TableCell>{(commission.commission_rate * 100).toFixed(1)}%</TableCell>
                        <TableCell>UGX {commission.commission_amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={commission.status === 'paid' ? 'default' : 'secondary'}>
                            {commission.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AgentApplicationDialog
        application={selectedApplication}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onApprove={handleApplicationAction}
        onReject={handleApplicationAction}
      />

      <AgentCommissionPayoutDialog
        agent={selectedAgent}
        commissions={commissions.filter(c => c.agent_id === selectedAgent?.id)}
        open={payoutDialogOpen}
        onOpenChange={setPayoutDialogOpen}
        onPayoutComplete={() => {
          // Refresh data after payout
          window.location.reload();
        }}
      />
    </UnifiedLayout>
  );
};

export default AdminAgent;
