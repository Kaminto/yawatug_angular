import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { useAgentIncomeStreams } from "@/hooks/useAgentIncomeStreams";

interface AgentIncomeHistoryProps {
  agentId: string;
}

const incomeTypeLabels = {
  agent_commission: "Commission",
  transaction_fee_share: "Fee Share",
  referral_commission: "Referral",
  dividend_income: "Dividend",
  capital_gains: "Capital Gains",
};

const statusColors = {
  pending: "secondary",
  processed: "outline", 
  paid: "default",
  failed: "destructive",
} as const;

export function AgentIncomeHistory({ agentId }: AgentIncomeHistoryProps) {
  const { data: incomeStreams, isLoading } = useAgentIncomeStreams(agentId);

  if (isLoading) {
    return <div className="animate-pulse">Loading income history...</div>;
  }

  if (!incomeStreams?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No income records found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Income History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {incomeStreams.map((stream) => (
            <div 
              key={stream.id} 
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">
                    {incomeTypeLabels[stream.income_type]}
                  </span>
                  <Badge variant={statusColors[stream.payment_status]}>
                    {stream.payment_status}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(stream.created_at), 'MMM dd, yyyy HH:mm')}
                  {stream.source_reference && (
                    <span className="ml-2">• {stream.source_reference}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">
                  {formatCurrency(stream.amount, stream.currency)}
                </div>
                {stream.paid_at && (
                  <div className="text-xs text-muted-foreground">
                    Paid: {format(new Date(stream.paid_at), 'MMM dd')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}