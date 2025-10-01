import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

interface AgentMetricsCardProps {
  agentId: string;
  agentCode: string;
  agentName: string;
  onMetricsUpdate?: () => void;
}

export const AgentMetricsCard: React.FC<AgentMetricsCardProps> = ({
  agentId,
  agentCode,
  agentName,
  onMetricsUpdate
}) => {
  const [updating, setUpdating] = React.useState(false);

  const handleUpdateMetrics = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase.rpc('update_agent_performance_metrics', {
        p_agent_id: agentId
      });

      if (error) throw error;

      toast.success('Agent metrics updated successfully');
      if (onMetricsUpdate) {
        onMetricsUpdate();
      }
    } catch (error: any) {
      console.error('Error updating metrics:', error);
      toast.error('Failed to update metrics: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Agent Metrics</CardTitle>
          <Badge variant="secondary">{agentCode}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Agent Name</p>
            <p className="font-medium">{agentName}</p>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleUpdateMetrics}
            disabled={updating}
            className="w-full"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${updating ? 'animate-spin' : ''}`} />
            {updating ? 'Updating...' : 'Update Metrics'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};