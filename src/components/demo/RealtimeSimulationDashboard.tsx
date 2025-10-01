import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Wallet, 
  TrendingUp, 
  Users, 
  FileText, 
  Activity,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';

interface RealtimeMetrics {
  walletBalance: number;
  portfolioValue: number;
  totalShares: number;
  referralEarnings: number;
  agentEarnings: number;
  businessScore: number;
}

interface RealtimeSimulationDashboardProps {
  userId: string;
  isSimulating: boolean;
  currentStep: string;
}

const RealtimeSimulationDashboard: React.FC<RealtimeSimulationDashboardProps> = ({
  userId,
  isSimulating,
  currentStep
}) => {
  const [metrics, setMetrics] = useState<RealtimeMetrics>({
    walletBalance: 0,
    portfolioValue: 0,
    totalShares: 0,
    referralEarnings: 0,
    agentEarnings: 0,
    businessScore: 0
  });
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    if (userId) {
      loadRealtimeMetrics();
      const interval = setInterval(loadRealtimeMetrics, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [userId]);

  const loadRealtimeMetrics = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Load wallet balance
      const { data: wallets } = await supabase
        .from('wallets')
        .select('balance, currency')
        .eq('user_id', userId);

      const walletBalance = wallets?.reduce((sum, wallet) => {
        return wallet.currency === 'UGX' ? sum + wallet.balance : sum + (wallet.balance * 3700);
      }, 0) || 0;

      // Load share holdings
      const { data: shares } = await supabase
        .from('user_share_holdings')
        .select('quantity, purchase_price')
        .eq('user_id', userId);

      const totalShares = shares?.reduce((sum, holding) => sum + holding.quantity, 0) || 0;
      const portfolioValue = shares?.reduce((sum, holding) => sum + (holding.quantity * 25000), 0) || 0;

      // Load referral earnings
      const { data: referralEarnings } = await supabase
        .from('referral_commissions')
        .select('commission_amount')
        .eq('referrer_id', userId);

      const totalReferralEarnings = referralEarnings?.reduce((sum, earning) => sum + earning.commission_amount, 0) || 0;

      // Load agent earnings
      const { data: agentStreams } = await supabase
        .from('agent_income_streams')
        .select('amount')
        .eq('agent_id', userId);

      const totalAgentEarnings = agentStreams?.reduce((sum, stream) => sum + stream.amount, 0) || 0;

      // Calculate business score
      const businessScore = Math.min(100, Math.round(
        (walletBalance / 10000) * 20 + 
        (totalShares / 10) * 30 + 
        (totalReferralEarnings / 5000) * 25 + 
        (totalAgentEarnings / 10000) * 25
      ));

      setMetrics({
        walletBalance,
        portfolioValue,
        totalShares,
        referralEarnings: totalReferralEarnings,
        agentEarnings: totalAgentEarnings,
        businessScore
      });

    } catch (error) {
      console.error('Error loading realtime metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { variant: 'default' as const, text: 'Excellent' };
    if (score >= 60) return { variant: 'secondary' as const, text: 'Good' };
    return { variant: 'destructive' as const, text: 'Needs Improvement' };
  };

  return (
    <Card className="border-yawatu-gold/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-yawatu-gold" />
            Live Business Metrics
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadRealtimeMetrics}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        {isSimulating && (
          <Badge variant="secondary" className="w-fit">
            Simulating: {currentStep.replace('_', ' ').toUpperCase()}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Business Score */}
        <div className="text-center space-y-2">
          <div className="text-2xl font-bold text-yawatu-gold">
            Business Score: {metrics.businessScore}/100
          </div>
          <Progress value={metrics.businessScore} className="w-full" />
          <Badge {...getScoreBadge(metrics.businessScore)}>
            {getScoreBadge(metrics.businessScore).text}
          </Badge>
        </div>

        {showDetails && (
          <div className="grid grid-cols-2 gap-4">
            {/* Wallet Value */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Total Wallet</span>
              </div>
              <div className="text-lg font-semibold">
                {formatCurrency(metrics.walletBalance, 'UGX')}
              </div>
            </div>

            {/* Portfolio Value */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Portfolio</span>
              </div>
              <div className="text-lg font-semibold">
                {formatCurrency(metrics.portfolioValue, 'UGX')}
              </div>
              <div className="text-xs text-muted-foreground">
                {metrics.totalShares} shares
              </div>
            </div>

            {/* Referral Earnings */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Referrals</span>
              </div>
              <div className="text-lg font-semibold">
                {formatCurrency(metrics.referralEarnings, 'UGX')}
              </div>
            </div>

            {/* Agent Earnings */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-muted-foreground">Agent Income</span>
              </div>
              <div className="text-lg font-semibold">
                {formatCurrency(metrics.agentEarnings, 'UGX')}
              </div>
            </div>
          </div>
        )}

        {/* Total Business Value */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total Business Value</span>
            <span className="text-xl font-bold text-yawatu-gold">
              {formatCurrency(
                metrics.walletBalance + 
                metrics.portfolioValue + 
                metrics.referralEarnings + 
                metrics.agentEarnings, 
                'UGX'
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RealtimeSimulationDashboard;