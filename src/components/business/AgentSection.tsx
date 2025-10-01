import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building, 
  DollarSign, 
  Clock, 
  CheckCircle,
  Users,
  TrendingUp,
  Target
} from 'lucide-react';
import { useAgentSummary } from '@/hooks/useAgentSummary';

interface AgentSectionProps {
  userId: string;
  period: string;
  showValues: boolean;
}

const AgentSection: React.FC<AgentSectionProps> = ({
  userId,
  period,
  showValues
}) => {
  const { agentSummary, loading } = useAgentSummary(userId, period);

  const formatCurrency = (amount: number) => {
    if (!showValues) return '••••••';
    return `UGX ${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-20 bg-muted rounded"></div>
              <div className="h-20 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show agent enrollment if user is not an agent
  if (!agentSummary?.isAgent) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Become an Agent</h3>
          <p className="text-muted-foreground mb-4">
            Earn commissions by helping others invest with Yawatu
          </p>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Earn up to 30% of transaction fees</p>
            <p>• Build your client network</p>
            <p>• Get performance bonuses</p>
            <p>• Access exclusive agent tools</p>
          </div>
          <div className="mt-6">
            <Badge variant="outline" className="text-xs">
              Apply to become an agent
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Agent Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5 text-primary" />
            Agent Performance
            <Badge variant="secondary" className="ml-auto">
              {agentSummary.agentTier}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Total Commissions */}
            <Card className="border-blue-200 bg-blue-50/30 dark:bg-blue-900/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Total Commissions</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    All time
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-blue-800 mb-1">
                  {formatCurrency(agentSummary?.totalCommissions || 0)}
                </p>
                <p className="text-xs text-blue-600">
                  Lifetime agent earnings
                </p>
              </CardContent>
            </Card>

            {/* Pending Commissions */}
            <Card className="border-orange-200 bg-orange-50/30 dark:bg-orange-900/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-700">Pending</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Processing
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-orange-800 mb-1">
                  {formatCurrency(agentSummary?.pendingCommissions || 0)}
                </p>
                <p className="text-xs text-orange-600">
                  Awaiting payment
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Agent Metrics */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Clients</p>
              <p className="text-lg font-bold text-primary">
                {showValues ? agentSummary?.totalClients || 0 : '••••'}
              </p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Active Clients</p>
              <p className="text-lg font-bold">
                {showValues ? agentSummary?.activeClients || 0 : '••••'}
              </p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Commission Rate</p>
              <p className="text-lg font-bold">
                {showValues ? `${(agentSummary?.commissionRate || 0) * 100}%` : '••••'}
              </p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Volume</p>
              <p className="text-lg font-bold">
                {formatCurrency(agentSummary?.totalVolume || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Commission Activity */}
      {agentSummary?.recentCommissions && agentSummary.recentCommissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Commission Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {agentSummary.recentCommissions.map((commission, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      commission.status === 'paid' 
                        ? 'bg-green-100 dark:bg-green-900/20'
                        : 'bg-orange-100 dark:bg-orange-900/20'
                    }`}>
                      {commission.status === 'paid' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-orange-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{commission.transactionType}</p>
                      <p className="text-sm text-muted-foreground">
                        Client: {commission.clientName} • {new Date(commission.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${
                      commission.status === 'paid' ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {formatCurrency(commission.amount)}
                    </p>
                    <Badge variant={commission.status === 'paid' ? 'default' : 'secondary'}>
                      {commission.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Agent Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-lg font-bold text-blue-800">
                {showValues ? agentSummary?.thisMonthClients || 0 : '••••'}
              </p>
              <p className="text-sm text-muted-foreground">New Clients</p>
              <p className="text-xs text-blue-600">This month</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
              <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-lg font-bold text-green-800">
                {formatCurrency(agentSummary?.thisMonthEarnings || 0)}
              </p>
              <p className="text-sm text-muted-foreground">Month Earnings</p>
              <p className="text-xs text-green-600">Commission earned</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
              <Target className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-lg font-bold text-purple-800">
                {showValues ? `${agentSummary?.performanceScore || 0}%` : '••••'}
              </p>
              <p className="text-sm text-muted-foreground">Performance</p>
              <p className="text-xs text-purple-600">This quarter</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Tier Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Agent Benefits - {agentSummary?.agentTier} Tier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Current Benefits</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {((agentSummary?.commissionRate || 0) * 100).toFixed(1)}% commission rate</li>
                <li>• Access to agent dashboard</li>
                <li>• Client management tools</li>
                <li>• Performance analytics</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Upgrade Benefits</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Higher commission rates (up to 40%)</li>
                <li>• Priority client support</li>
                <li>• Marketing materials access</li>
                <li>• Monthly performance bonuses</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentSection;