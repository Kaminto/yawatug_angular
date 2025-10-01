import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, Users, UserCheck } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface NavigationGridProps {
  userWallets: any[];
  sharesValue: number;
  sharesROI: number;
  referralEarnings: number;
  agentEarnings?: number;
  isAgent?: boolean;
}

const DashboardNavigationGrid: React.FC<NavigationGridProps> = ({
  userWallets,
  sharesValue,
  sharesROI,
  referralEarnings,
  agentEarnings = 0,
  isAgent = false
}) => {
  const navigate = useNavigate();

  const ugxWallet = userWallets.find(w => w.currency === 'UGX');
  const usdWallet = userWallets.find(w => w.currency === 'USD');

  const navigationCards = [
    {
      title: 'Wallet',
      icon: Wallet,
      color: 'elegant-card border-l-4 border-accent-blue',
      hoverColor: 'hover:shadow-lg hover:border-accent-blue/80',
      textColor: 'text-card-foreground',
      iconColor: 'text-accent-blue',
      preview: (
        <div className="space-y-1 md:space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
            <div>
              <span className="text-muted-foreground">UGX:</span>
              <div className="font-semibold text-foreground">
                {formatCurrency(ugxWallet?.balance || 0, 'UGX').split(' ')[1]}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">USD:</span>
              <div className="font-semibold text-foreground">
                {formatCurrency(usdWallet?.balance || 0, 'USD').split(' ')[1]}
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-center">Available Balance</div>
        </div>
      ),
      onClick: () => navigate('/user-wallet')
    },
    {
      title: 'Shares',
      icon: TrendingUp,
      color: 'elegant-card border-l-4 border-accent-purple',
      hoverColor: 'hover:shadow-lg hover:border-accent-purple/80',
      textColor: 'text-card-foreground',
      iconColor: 'text-accent-purple',
      preview: (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Value:</span>
            <span className="font-semibold text-foreground">{formatCurrency(sharesValue, 'UGX')}</span>
          </div>
          <div className={`text-xs flex items-center justify-center gap-1 ${sharesROI >= 0 ? 'text-accent-green' : 'text-destructive'}`}>
            ROI: {sharesROI >= 0 ? '+' : ''}{sharesROI.toFixed(1)}%
          </div>
        </div>
      ),
      onClick: () => navigate('/user-shares')
    },
    {
      title: 'Business',
      icon: Users,
      color: 'elegant-card border-l-4 border-accent-green',
      hoverColor: 'hover:shadow-lg hover:border-accent-green/80',
      textColor: 'text-card-foreground',
      iconColor: 'text-accent-green',
      preview: (
        <div className="space-y-1 md:space-y-2">
          <div className="text-xs md:text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Earnings:</span>
              <span className="font-semibold text-foreground">{formatCurrency(referralEarnings, 'UGX')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Growth:</span>
              <span className="font-semibold text-accent-green">+12.5%</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-center">3 Active Streams</div>
        </div>
      ),
      onClick: () => navigate('/referral')
    }
  ];

  // Add Orders card as fourth main card, move Agent to replace if needed
  navigationCards.push({
    title: 'Orders',
    icon: UserCheck,
    color: 'elegant-card border-l-4 border-accent-orange',
    hoverColor: 'hover:shadow-lg hover:border-accent-orange/80',
    textColor: 'text-card-foreground',
    iconColor: 'text-accent-orange',
      preview: (
        <div className="space-y-1 md:space-y-2">
          <div className="text-xs md:text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Buy:</span>
              <span className="font-semibold text-foreground">2 Active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sell:</span>
              <span className="font-semibold text-foreground">0 Pending</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-center">5 Completed</div>
        </div>
      ),
    onClick: () => navigate('/user-shares')
  });

  // Add agent card only if user is an agent (as 5th card)
  if (isAgent) {
    navigationCards.push({
      title: 'Agent',
      icon: UserCheck,
      color: 'elegant-card border-l-4 border-accent-purple',
      hoverColor: 'hover:shadow-lg hover:border-accent-purple/80',
      textColor: 'text-card-foreground',
      iconColor: 'text-accent-purple',
      preview: (
        <div className="space-y-1 md:space-y-2">
          <div className="text-xs md:text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Commission:</span>
              <span className="font-semibold text-foreground">{formatCurrency(agentEarnings, 'UGX')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Referrals:</span>
              <span className="font-semibold text-accent-green">24 Active</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-center">Premium Level</div>
        </div>
      ),
      onClick: () => navigate('/agent-dashboard')
    });
  }

  return (
    <div className={`grid grid-cols-2 gap-4 ${isAgent ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
      {navigationCards.map((card, index) => (
        <Card
          key={index}
          className={`${card.color} ${card.hoverColor} ${card.textColor} cursor-pointer transition-all duration-200 hover:scale-[1.02] shadow-md`}
          onClick={card.onClick}
        >
          <CardContent className="p-3 md:p-6">
            <div className="flex flex-col items-center text-center space-y-2 md:space-y-3">
              <card.icon className={`h-6 w-6 md:h-8 md:w-8 ${card.iconColor}`} />
              <div>
                <h3 className="font-semibold text-sm md:text-lg">{card.title}</h3>
                <div className="text-xs md:text-sm">
                  {card.preview}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardNavigationGrid;