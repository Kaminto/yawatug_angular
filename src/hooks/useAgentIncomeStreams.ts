import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AgentIncomeStream {
  id: string;
  agent_id: string;
  income_type: 'agent_commission' | 'transaction_fee_share' | 'referral_commission' | 'dividend_income' | 'capital_gains';
  amount: number;
  currency: string;
  source_transaction_id?: string;
  source_reference?: string;
  payment_status: 'pending' | 'processed' | 'paid' | 'failed';
  processed_at?: string;
  paid_at?: string;
  created_at: string;
  metadata?: any;
}

export interface AgentPerformanceMetrics {
  id: string;
  agent_id: string;
  metric_date: string;
  total_clients: number;
  active_clients: number;
  new_clients_month: number;
  total_transactions_facilitated: number;
  total_transaction_volume: number;
  total_fees_generated: number;
  agent_fee_earnings: number;
  commission_earnings: number;
  referral_earnings: number;
  dividend_earnings: number;
  capital_gains: number;
  total_earnings: number;
  client_retention_rate: number;
  average_transaction_size: number;
  currency: string;
}

export const useAgentIncomeStreams = (agentId?: string) => {
  return useQuery({
    queryKey: ['agent-income-streams', agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_income_streams')
        .select('*')
        .eq('agent_id', agentId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AgentIncomeStream[];
    },
    enabled: !!agentId,
  });
};

export const useAgentPerformanceMetrics = (agentId?: string) => {
  return useQuery({
    queryKey: ['agent-performance-metrics', agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_performance_metrics')
        .select('*')
        .eq('agent_id', agentId!)
        .order('metric_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data as AgentPerformanceMetrics[];
    },
    enabled: !!agentId,
  });
};

export const useAgentTransactionFees = (agentId?: string) => {
  return useQuery({
    queryKey: ['agent-transaction-fees', agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_transaction_fees')
        .select(`
          *,
          transaction:transactions(
            transaction_type,
            amount,
            status,
            created_at
          ),
          client:profiles!client_id(
            full_name,
            email
          )
        `)
        .eq('agent_id', agentId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!agentId,
  });
};