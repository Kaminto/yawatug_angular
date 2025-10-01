import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

interface AgentClientProps {
  agentId: string;
}

interface AgentClient {
  id: string;
  agent_id: string;
  client_id: string;
  status: string;
  onboarded_at: string;
  created_at: string;
  client: {
    full_name: string;
    email: string;
    phone: string;
    profile_picture_url?: string;
  };
  transaction_count: number;
  total_volume: number;
}

export function AgentClientsList({ agentId }: AgentClientProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['agent-clients', agentId],
    queryFn: async () => {
      // First get all clients for the agent
      const { data: clientData, error } = await supabase
        .from('agent_clients')
        .select(`
          *,
          client:profiles!client_id(
            full_name, 
            email, 
            phone,
            profile_picture_url
          )
        `)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // For each client, get their transaction counts and volumes
      const clientsWithStats = await Promise.all(clientData.map(async (client) => {
        // Get transaction count and volume
        const { count: transactionCount } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', client.client_id)
          .eq('status', 'completed');

        const { data: volumeData } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', client.client_id)
          .eq('status', 'completed');

        const totalVolume = volumeData?.reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0) || 0;

        return {
          ...client,
          transaction_count: transactionCount || 0,
          total_volume: totalVolume,
        };
      }));

      return clientsWithStats as AgentClient[];
    },
    enabled: !!agentId,
  });

  if (isLoading) {
    return <div className="animate-pulse">Loading client list...</div>;
  }

  if (!data?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agent Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No clients found for this agent.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Clients ({data.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((clientRelation) => (
            <div 
              key={clientRelation.id} 
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage 
                    src={clientRelation.client.profile_picture_url || ''} 
                    alt={clientRelation.client.full_name}
                  />
                  <AvatarFallback>
                    {clientRelation.client.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{clientRelation.client.full_name}</div>
                  <div className="text-sm text-muted-foreground">{clientRelation.client.email}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>Client since: {format(new Date(clientRelation.created_at), 'MMM dd, yyyy')}</span>
                    <Badge variant={clientRelation.status === 'active' ? 'default' : 'secondary'}>
                      {clientRelation.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">{clientRelation.transaction_count} transactions</div>
                <div className="text-sm text-muted-foreground">
                  Volume: {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'UGX',
                    maximumFractionDigits: 0,
                  }).format(clientRelation.total_volume)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}