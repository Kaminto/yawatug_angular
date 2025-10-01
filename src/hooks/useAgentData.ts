import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AgentStats {
  totalAgents: number;
  pendingApplications: number;
  totalCommissions: number;
  totalClients: number;
  activeAgents: number;
}

export interface AgentApplication {
  id: string;
  user_id: string;
  location: string;
  expected_customers: number;
  reason: string;
  experience?: string;
  business_plan?: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

export interface Agent {
  id: string;
  user_id: string;
  agent_code: string;
  commission_rate: number;
  status: string;
  total_earnings?: number;
  total_clients?: number;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

export const useAgentData = () => {
  const [applications, setApplications] = useState<AgentApplication[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [stats, setStats] = useState<AgentStats>({
    totalAgents: 0,
    pendingApplications: 0,
    totalCommissions: 0,
    totalClients: 0,
    activeAgents: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAgentData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load agent applications with profile data
      const { data: applicationsData, error: appsError } = await supabase
        .from('agent_applications')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (appsError) throw appsError;

      // Load agents with profile data
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (agentsError) throw agentsError;

      // Load commissions
      const { data: commissionsData, error: commissionsError } = await supabase
        .from('agent_commissions')
        .select(`
          *,
          agents:agent_id (
            agent_code,
            profiles:user_id (
              full_name,
              email
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (commissionsError) throw commissionsError;

      // Get client count
      const { count: clientCount } = await supabase
        .from('agent_clients')
        .select('*', { count: 'exact', head: true });

      // Calculate stats
      const totalCommissions = commissionsData?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0;
      const pendingApps = applicationsData?.filter(a => a.status === 'pending').length || 0;
      const activeAgents = agentsData?.filter(a => a.status === 'active').length || 0;

      setApplications((applicationsData || []) as any);
      setAgents((agentsData || []) as any);
      setCommissions(commissionsData || []);
      setStats({
        totalAgents: agentsData?.length || 0,
        pendingApplications: pendingApps,
        totalCommissions,
        totalClients: clientCount || 0,
        activeAgents
      });

    } catch (err: any) {
      console.error('Error loading agent data:', err);
      setError(err.message || 'Failed to load agent data');
      toast.error('Failed to load agent data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const approveApplication = async (applicationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update application status
      const { error: updateError } = await supabase
        .from('agent_applications')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // Create agent record
      const application = applications.find(a => a.id === applicationId);
      if (application) {
        // Generate unique agent code using the database function
        const { data: agentCodeData } = await supabase.rpc('generate_unique_agent_code');
        
        const { error: agentError } = await supabase
          .from('agents')
          .insert({
            user_id: application.user_id,
            agent_code: agentCodeData,
            commission_rate: 0.05, // 5% default
            status: 'active'
          });

        if (agentError) throw agentError;
      }

      toast.success('Application approved successfully');
      await loadAgentData();
    } catch (err: any) {
      console.error('Error approving application:', err);
      toast.error('Failed to approve application');
      throw err;
    }
  };

  const rejectApplication = async (applicationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('agent_applications')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast.success('Application rejected');
      await loadAgentData();
    } catch (err: any) {
      console.error('Error rejecting application:', err);
      toast.error('Failed to reject application');
      throw err;
    }
  };

  const updateAgentStatus = async (agentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('agents')
        .update({ status })
        .eq('id', agentId);

      if (error) throw error;

      toast.success('Agent status updated successfully');
      await loadAgentData();
    } catch (err: any) {
      console.error('Error updating agent status:', err);
      toast.error('Failed to update agent status');
      throw err;
    }
  };

  useEffect(() => {
    loadAgentData();

    // Set up real-time subscriptions
    const applicationsChannel = supabase
      .channel('agent_applications_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'agent_applications' },
        () => loadAgentData())
      .subscribe();

    const agentsChannel = supabase
      .channel('agents_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        () => loadAgentData())
      .subscribe();

    return () => {
      supabase.removeChannel(applicationsChannel);
      supabase.removeChannel(agentsChannel);
    };
  }, []);

  return {
    applications,
    agents,
    commissions,
    stats,
    loading,
    error,
    loadAgentData,
    approveApplication,
    rejectApplication,
    updateAgentStatus
  };
};