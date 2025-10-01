import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Send, 
  TrendingUp,
  QrCode,
  Plus,
  Smartphone,
  Clock,
  Target
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: string;
  popular?: boolean;
  comingSoon?: boolean;
}

interface QuickActionsPanelProps {
  onActionClick?: (actionId: string) => void;
  userBalance?: number;
  currency?: string;
}

const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({ 
  onActionClick,
  userBalance = 0,
  currency = 'UGX'
}) => {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const quickActions: QuickAction[] = [
    {
      id: 'quick-deposit',
      title: 'Quick Deposit',
      description: 'Add funds instantly',
      icon: <Plus className="h-5 w-5" />,
      badge: 'Instant',
      popular: true,
      onClick: () => onActionClick?.('deposit')
    },
    {
      id: 'buy-shares',
      title: 'Buy Shares',
      description: 'Invest in mining',
      icon: <TrendingUp className="h-5 w-5" />,
      href: '/shares',
      popular: true
    },
    {
      id: 'mobile-money',
      title: 'Mobile Money',
      description: 'Deposit via MTN/Airtel',
      icon: <Smartphone className="h-5 w-5" />,
      badge: 'Popular',
      onClick: () => onActionClick?.('mobile-money')
    },
    {
      id: 'qr-pay',
      title: 'QR Payment',
      description: 'Scan to pay',
      icon: <QrCode className="h-5 w-5" />,
      onClick: () => onActionClick?.('qr-pay')
    },
    {
      id: 'send-money',
      title: 'Send Money',
      description: 'Transfer to anyone',
      icon: <Send className="h-5 w-5" />,
      onClick: () => onActionClick?.('transfer')
    },
    {
      id: 'scheduled-payments',
      title: 'Scheduled Payments',
      description: 'Set recurring transactions',
      icon: <Clock className="h-5 w-5" />,
      comingSoon: true
    },
    {
      id: 'investment-goals',
      title: 'Investment Goals',
      description: 'Set savings targets',
      icon: <Target className="h-5 w-5" />,
      comingSoon: true
    }
  ];

  const handleActionClick = (action: QuickAction) => {
    if (action.comingSoon) return;
    
    setSelectedAction(action.id);
    
    if (action.onClick) {
      action.onClick();
    }
    
    // Reset selection after animation
    setTimeout(() => setSelectedAction(null), 200);
  };

  const getSmartSuggestions = () => {
    const suggestions = [];
    
    if (userBalance < 50000) {
      suggestions.push({
        text: "Buy shares to start earning",
        action: "buy-shares",
        priority: "high"
      });
    }
    
    if (userBalance >= 50000 && userBalance < 200000) {
      suggestions.push({
        text: "Buy more shares to earn more dividends",
        action: "buy-shares",
        priority: "high"
      });
    }
    
    if (userBalance > 100000) {
      suggestions.push({
        text: "Schedule payments for regular investing",
        action: "scheduled-payments",
        priority: "medium"
      });
    }
    
    suggestions.push({
      text: "Set investment goals for 2024",
      action: "investment-goals",
      priority: "low"
    });
    
    return suggestions;
  };

  const smartSuggestions = getSmartSuggestions();

  return (
    <div className="space-y-4">
      {/* Smart Suggestions */}
      {smartSuggestions.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Smart Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {smartSuggestions.map((suggestion, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-background rounded-lg">
                <span className="text-sm">{suggestion.text}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const action = quickActions.find(a => a.id === suggestion.action);
                    if (action) handleActionClick(action);
                  }}
                >
                  {suggestion.action === 'buy-shares' ? 'Invest' : 
                   suggestion.action === 'scheduled-payments' ? 'Schedule' : 'Set Goal'}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Highlights */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Highlights</h3>
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center">
            <CardContent className="p-3">
              <ArrowDownLeft className="h-4 w-4 text-green-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="font-medium text-sm">5 Deposits</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-3">
              <ArrowUpRight className="h-4 w-4 text-blue-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Invested</p>
              <p className="font-medium text-sm">{currency} 250K</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-3">
              <TrendingUp className="h-4 w-4 text-purple-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Growth</p>
              <p className="font-medium text-sm text-green-500">+12.5%</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default QuickActionsPanel;