import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AgentCommission {
  transactionType: string;
  clientName: string;
  date: string;
  amount: number;
  status: 'pending' | 'paid';
}

export interface AgentSummaryData {
  isAgent: boolean;
  agentTier: string;
  
  // Commission data
  totalCommissions: number;
  pendingCommissions: number;
  paidCommissions: number;
  
  // Performance metrics
  totalClients: number;
  activeClients: number;
  commissionRate: number;
  totalVolume: number;
  
  // Recent activity
  thisMonthClients: number;
  thisMonthEarnings: number;
  performanceScore: number;
  
  // Details
  recentCommissions: AgentCommission[];
}

export const useAgentSummary = (userId: string, period: string) => {
  const [agentSummary, setAgentSummary] = useState<AgentSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadAgentSummary();
    }
  }, [userId, period]);

  const getPeriodFilter = () => {
    const now = new Date();
    switch (period) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      case 'all':
      default:
        return '1970-01-01T00:00:00Z';
    }
  };

  const loadAgentSummary = async () => {
    try {
      setLoading(true);
      const periodFilter = getPeriodFilter();
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Check if user is an agent
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (agentError && agentError.code !== 'PGRST116') {
        console.error('Error checking agent status:', agentError);
        throw agentError;
      }

      // If user is not an agent, return non-agent state
      if (!agentData) {
        setAgentSummary({
          isAgent: false,
          agentTier: '',
          totalCommissions: 0,
          pendingCommissions: 0,
          paidCommissions: 0,
          totalClients: 0,
          activeClients: 0,
          commissionRate: 0,
          totalVolume: 0,
          thisMonthClients: 0,
          thisMonthEarnings: 0,
          performanceScore: 0,
          recentCommissions: []
        });
        return;
      }

      const agentId = agentData.id;

      // Load agent data
      const [
        agentIncomeResult,
        agentClientsResult,
        agentPerformanceResult
      ] = await Promise.all([
        // Agent income streams
        supabase
          .from('agent_income_streams')
          .select('*')
          .eq('agent_id', agentId)
          .gte('created_at', periodFilter)
          .order('created_at', { ascending: false }),

        // Agent clients
        supabase
          .from('agent_clients')
          .select('*')
          .eq('agent_id', agentId),

        // Agent performance metrics
        supabase
          .from('agent_performance_metrics')
          .select('*')
          .eq('agent_id', agentId)
          .order('metric_date', { ascending: false })
          .limit(1)
      ]);

      const agentIncome = agentIncomeResult.data || [];
      const agentClients = agentClientsResult.data || [];
      const latestPerformance = agentPerformanceResult.data?.[0];

      // Calculate commission totals
      const totalCommissions = agentIncome.reduce((sum, income) => sum + income.amount, 0);
      const paidCommissions = agentIncome
        .filter(income => income.payment_status === 'paid')
        .reduce((sum, income) => sum + income.amount, 0);
      const pendingCommissions = totalCommissions - paidCommissions;

      // Calculate this month metrics
      const thisMonthIncome = agentIncome.filter(income => 
        new Date(income.created_at) >= new Date(thisMonthStart)
      );
      const thisMonthEarnings = thisMonthIncome.reduce((sum, income) => sum + income.amount, 0);

      // Recent commissions
      const recentCommissions: AgentCommission[] = agentIncome.slice(0, 10).map(income => ({
        transactionType: income.income_type.replace(/_/g, ' ').toUpperCase(),
        clientName: `Client ${income.source_reference || 'Unknown'}`,
        date: income.created_at,
        amount: income.amount,
        status: income.payment_status as 'pending' | 'paid'
      }));

      const summaryData: AgentSummaryData = {
        isAgent: true,
        agentTier: agentData.tier || 'Bronze',
        totalCommissions,
        pendingCommissions,
        paidCommissions,
        totalClients: agentData.total_clients || 0,
        activeClients: agentData.active_clients || 0,
        commissionRate: agentData.commission_rate || 0.3,
        totalVolume: agentData.total_transaction_volume || 0,
        thisMonthClients: latestPerformance?.new_clients_month || 0,
        thisMonthEarnings,
        performanceScore: agentData.performance_score || 0,
        recentCommissions
      };

      setAgentSummary(summaryData);

    } catch (error) {
      console.error('Error loading agent summary:', error);
      
      // Provide empty agent state on error
      setAgentSummary({
        isAgent: false,
        agentTier: '',
        totalCommissions: 0,
        pendingCommissions: 0,
        paidCommissions: 0,
        totalClients: 0,
        activeClients: 0,
        commissionRate: 0,
        totalVolume: 0,
        thisMonthClients: 0,
        thisMonthEarnings: 0,
        performanceScore: 0,
        recentCommissions: []
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    agentSummary,
    loading,
    refreshAgentSummary: loadAgentSummary
  };
};