import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Coins, 
  Users, 
  DollarSign, 
  Gift,
  PieChart
} from "lucide-react";
import { useAgentIncomeStreams, useAgentPerformanceMetrics } from "@/hooks/useAgentIncomeStreams";
import { formatCurrency } from "@/lib/utils";

interface AgentIncomeOverviewProps {
  agentId: string;
}

const incomeTypeIcons = {
  agent_commission: Users,
  transaction_fee_share: Coins,
  referral_commission: Gift,
  dividend_income: DollarSign,
  capital_gains: TrendingUp,
};

const incomeTypeLabels = {
  agent_commission: "Agent Commission",
  transaction_fee_share: "Fee Sharing",
  referral_commission: "Referral Bonus",
  dividend_income: "Dividends",
  capital_gains: "Capital Gains",
};

export function AgentIncomeOverview({ agentId }: AgentIncomeOverviewProps) {
  const { data: incomeStreams, isLoading: incomeLoading } = useAgentIncomeStreams(agentId);
  const { data: metrics, isLoading: metricsLoading } = useAgentPerformanceMetrics(agentId);

  if (incomeLoading || metricsLoading) {
    return <div className="animate-pulse">Loading income overview...</div>;
  }

  const latestMetrics = metrics?.[0];
  
  // Calculate income by type
  const incomeByType = incomeStreams?.reduce((acc, stream) => {
    if (stream.payment_status === 'paid') {
      acc[stream.income_type] = (acc[stream.income_type] || 0) + stream.amount;
    }
    return acc;
  }, {} as Record<string, number>);

  const totalEarnings = Object.values(incomeByType || {}).reduce((sum, amount) => sum + amount, 0);

  return (
    <div className="space-y-6">
      {/* Total Earnings Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Total Earnings Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary mb-2">
            {formatCurrency(totalEarnings, 'UGX')}
          </div>
          <p className="text-muted-foreground">
            Total earnings across all income streams
          </p>
        </CardContent>
      </Card>

      {/* Income Streams Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(incomeTypeLabels).map(([type, label]) => {
          const Icon = incomeTypeIcons[type as keyof typeof incomeTypeIcons];
          const amount = incomeByType?.[type] || 0;
          
          return (
            <Card key={type}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <Badge variant={amount > 0 ? "default" : "secondary"}>
                    {formatCurrency(amount, 'UGX')}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Performance Metrics */}
      {latestMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{latestMetrics.total_clients}</div>
                <p className="text-sm text-muted-foreground">Total Clients</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{latestMetrics.active_clients}</div>
                <p className="text-sm text-muted-foreground">Active Clients</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {formatCurrency(latestMetrics.total_transaction_volume, 'UGX')}
                </div>
                <p className="text-sm text-muted-foreground">Transaction Volume</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {latestMetrics.client_retention_rate.toFixed(1)}%
                </div>
                <p className="text-sm text-muted-foreground">Retention Rate</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}