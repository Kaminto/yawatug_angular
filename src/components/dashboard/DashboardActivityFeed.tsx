import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  ArrowRightLeft, 
  CreditCard,
  DollarSign,
  Users,
  ExternalLink
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface Activity {
  id: string;
  type: 'deposit' | 'withdraw' | 'transfer' | 'payment' | 'dividend' | 'referral' | 'share_buy' | 'share_sell';
  amount: number;
  currency: string;
  description: string;
  date: string;
  status?: string;
}

interface ActivityFeedProps {
  activities: Activity[];
}

const DashboardActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  const navigate = useNavigate();

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'deposit':
        return ArrowDownCircle;
      case 'withdraw':
        return ArrowUpCircle;
      case 'transfer':
        return ArrowRightLeft;
      case 'payment':
        return CreditCard;
      case 'dividend':
        return DollarSign;
      case 'referral':
        return Users;
      case 'share_buy':
      case 'share_sell':
        return ArrowRightLeft;
      default:
        return CreditCard;
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'deposit':
      case 'dividend':
      case 'referral':
        return 'text-green-600';
      case 'withdraw':
      case 'payment':
        return 'text-red-600';
      case 'transfer':
      case 'share_buy':
      case 'share_sell':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getActivityPrefix = (type: Activity['type']) => {
    switch (type) {
      case 'deposit':
        return '🟢 Deposit';
      case 'withdraw':
        return '🔴 Withdraw';
      case 'transfer':
        return '🔄 Transfer';
      case 'payment':
        return '💳 Payment';
      case 'dividend':
        return '💵 Dividend';
      case 'referral':
        return '🟡 Referral';
      case 'share_buy':
        return '🟢 Buy';
      case 'share_sell':
        return '🔴 Sell';
      default:
        return '📋 Transaction';
    }
  };

  if (!activities || activities.length === 0) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Recent Activities
            <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')}>
              View Full History
              <ExternalLink className="h-4 w-4 ml-1" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No recent activities</p>
            <p className="text-sm">Your transactions will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Recent Activities
          <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')}>
            View Full History
            <ExternalLink className="h-4 w-4 ml-1" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.slice(0, 5).map((activity) => {
            const Icon = getActivityIcon(activity.type);
            const colorClass = getActivityColor(activity.type);
            const prefix = getActivityPrefix(activity.type);

            return (
              <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <Icon className={`h-5 w-5 ${colorClass} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {prefix} {formatCurrency(Math.abs(activity.amount), activity.currency)}
                    </span>
                    {activity.status && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        activity.status === 'completed' 
                          ? 'bg-green-100 text-green-700' 
                          : activity.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {activity.status}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {activity.description}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(activity.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardActivityFeed;