import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Wallet, Coins } from 'lucide-react';

interface PortfolioQuickStatsProps {
  userShares: any[];
  userWallets: any[];
  sharePool: any;
  totalSharesOverride?: number;
}

const PortfolioQuickStats: React.FC<PortfolioQuickStatsProps> = ({
  userShares,
  userWallets,
  sharePool,
  totalSharesOverride
}) => {
  const totalShares =
    typeof totalSharesOverride === 'number'
      ? totalSharesOverride
      : userShares?.reduce((sum, share) => sum + (share.quantity || 0), 0) || 0;
  const portfolioValue = totalShares * (sharePool?.price_per_share || 25000);
  const availableBalance = userWallets?.find(w => w.currency === 'UGX')?.balance || 0;

  const stats = [
    {
      icon: Coins,
      label: 'Total Shares',
      value: totalShares.toLocaleString(),
      color: 'text-blue-600'
    },
    {
      icon: TrendingUp,
      label: 'Portfolio Value',
      value: `UGX ${portfolioValue.toLocaleString()}`,
      color: 'text-green-600'
    },
    {
      icon: Wallet,
      label: 'Available Balance',
      value: `UGX ${availableBalance.toLocaleString()}`,
      color: 'text-purple-600'
    }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Portfolio Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div 
                key={index} 
                className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className={`p-2 rounded-lg bg-accent/10 ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-lg font-semibold truncate">{stat.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioQuickStats;
