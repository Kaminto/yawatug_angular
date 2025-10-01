import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { TrendingUp, AlertCircle, Target, ArrowRight } from 'lucide-react';

interface PortfolioRecommendationsProps {
  totalShares: number;
  portfolioValue: number;
  walletBalance: number;
}

const PortfolioRecommendations: React.FC<PortfolioRecommendationsProps> = ({
  totalShares,
  portfolioValue,
  walletBalance
}) => {
  const recommendations: Array<{
    id: string;
    type: 'opportunity' | 'warning' | 'tip';
    title: string;
    description: string;
    action?: { label: string; path: string };
  }> = [];

  // Generate smart recommendations
  if (totalShares === 0 && walletBalance > 50000) {
    recommendations.push({
      id: 'start-investing',
      type: 'opportunity',
      title: 'Start Your Investment Journey',
      description: `You have ${walletBalance.toLocaleString()} UGX available. Start building your portfolio today.`,
      action: { label: 'Buy Shares', path: '/shares' }
    });
  }

  if (totalShares > 0 && totalShares < 10) {
    recommendations.push({
      id: 'diversify',
      type: 'tip',
      title: 'Diversify Your Portfolio',
      description: 'Consider adding more shares to spread risk and maximize potential returns.',
      action: { label: 'Add More', path: '/shares' }
    });
  }

  if (walletBalance < 10000 && totalShares > 0) {
    recommendations.push({
      id: 'low-liquidity',
      type: 'warning',
      title: 'Low Wallet Balance',
      description: 'Top up your wallet to be ready for new investment opportunities.',
      action: { label: 'Deposit Funds', path: '/wallet?open=deposit' }
    });
  }

  if (totalShares >= 10) {
    recommendations.push({
      id: 'great-portfolio',
      type: 'opportunity',
      title: 'Strong Portfolio! 🎉',
      description: 'You have a well-diversified portfolio. Keep building for long-term growth.',
      action: { label: 'Continue Investing', path: '/shares' }
    });
  }

  if (recommendations.length === 0) return null;

  const getTypeColor = (type: 'opportunity' | 'warning' | 'tip') => {
    switch (type) {
      case 'opportunity': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'warning': return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      case 'tip': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    }
  };

  const getTypeIcon = (type: 'opportunity' | 'warning' | 'tip') => {
    switch (type) {
      case 'opportunity': return <TrendingUp className="h-5 w-5" />;
      case 'warning': return <AlertCircle className="h-5 w-5" />;
      case 'tip': return <Target className="h-5 w-5" />;
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Smart Recommendations</CardTitle>
            <CardDescription className="text-xs">Personalized investment insights</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className={`p-4 rounded-xl border ${getTypeColor(rec.type)}`}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-shrink-0">{getTypeIcon(rec.type)}</div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm mb-1">{rec.title}</h4>
                <p className="text-xs opacity-90">{rec.description}</p>
              </div>
            </div>
            {rec.action && (
              <Button asChild size="sm" className="w-full" variant="outline">
                <Link to={rec.action.path}>
                  {rec.action.label}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PortfolioRecommendations;
