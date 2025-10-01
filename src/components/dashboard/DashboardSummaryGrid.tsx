import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Bell,
  Calendar,
  BarChart3
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface SummaryGridProps {
  lastDividendPayout: {
    amount: number;
    date: string;
  };
  companyPerformance: {
    totalSharesSold: number;
    currentSharePrice: number;
  };
  ordersStatus: {
    pending: number;
    completed: number;
  };
  latestNotice: {
    title: string;
    date: string;
    type: 'notice' | 'voting';
  };
}

const DashboardSummaryGrid: React.FC<SummaryGridProps> = ({
  lastDividendPayout,
  companyPerformance,
  ordersStatus,
  latestNotice
}) => {
  const summaryCards = [
    {
      title: 'Last Dividend',
      icon: DollarSign,
      bgColor: 'elegant-card gold-gradient',
      iconColor: 'text-accent-green',
      borderColor: 'border-l-4 border-accent-green',
      content: (
        <div className="space-y-2">
          <div className="text-2xl font-bold text-foreground">
            {formatCurrency(lastDividendPayout.amount, 'UGX')}
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(lastDividendPayout.date).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </div>
        </div>
      )
    },
    {
      title: 'Share Price',
      icon: BarChart3,
      bgColor: 'elegant-card gold-gradient',
      iconColor: 'text-accent-blue',
      borderColor: 'border-l-4 border-accent-blue',
      content: (
        <div className="space-y-2">
          <div className="text-2xl font-bold text-foreground">
            {formatCurrency(companyPerformance.currentSharePrice, 'UGX')}
          </div>
          <div className="text-sm text-muted-foreground">
            {companyPerformance.totalSharesSold.toLocaleString()} shares sold
          </div>
        </div>
      )
    },
    {
      title: 'Orders',
      icon: Clock,
      bgColor: 'elegant-card gold-gradient',
      iconColor: 'text-accent-orange',
      borderColor: 'border-l-4 border-accent-orange',
      content: (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Pending</span>
            <Badge 
              variant="secondary" 
              className="bg-accent-orange/10 text-accent-orange border-accent-orange/20"
            >
              {ordersStatus.pending}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Completed</span>
            <Badge 
              variant="secondary" 
              className="bg-accent-green/10 text-accent-green border-accent-green/20"
            >
              {ordersStatus.completed}
            </Badge>
          </div>
        </div>
      )
    },
    {
      title: 'Latest Notice',
      icon: Bell,
      bgColor: 'elegant-card gold-gradient',
      iconColor: 'text-accent-purple',
      borderColor: 'border-l-4 border-accent-purple',
      content: (
        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground line-clamp-2">
            {latestNotice.title}
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(latestNotice.date).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short'
              })}
            </div>
            <Badge 
              variant={latestNotice.type === 'voting' ? 'default' : 'secondary'}
              className={latestNotice.type === 'voting' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
              }
            >
              {latestNotice.type}
            </Badge>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
      {summaryCards.map((card, index) => (
        <Card 
          key={index} 
          className={`${card.bgColor} ${card.borderColor} hover:shadow-lg hover:shadow-primary/20 transition-all duration-300`}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
              <card.icon className={`h-4 w-4 ${card.iconColor}`} />
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {card.content}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardSummaryGrid;