import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar,
  PieChart,
  Award,
  Lightbulb,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface SpendingCategory {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  deadline: string;
  category: string;
}

interface Insight {
  type: 'tip' | 'warning' | 'achievement' | 'suggestion';
  title: string;
  description: string;
  action?: string;
  icon: React.ReactNode;
}

const WalletInsightsDashboard: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('month');
  const [spendingData, setSpendingData] = useState<SpendingCategory[]>([
    { name: 'Share Purchases', amount: 150000, percentage: 60, color: 'bg-blue-500' },
    { name: 'Transfers', amount: 50000, percentage: 20, color: 'bg-green-500' },
    { name: 'Withdrawals', amount: 30000, percentage: 12, color: 'bg-orange-500' },
    { name: 'Fees', amount: 20000, percentage: 8, color: 'bg-red-500' }
  ]);

  const [goals, setGoals] = useState<Goal[]>([
    {
      id: '1',
      title: 'Emergency Fund',
      target: 500000,
      current: 320000,
      deadline: '2024-12-31',
      category: 'savings'
    },
    {
      id: '2',
      title: 'Share Investment',
      target: 1000000,
      current: 650000,
      deadline: '2024-06-30',
      category: 'investment'
    }
  ]);

  const [insights, setInsights] = useState<Insight[]>([
    {
      type: 'tip',
      title: 'Investment Opportunity',
      description: 'You have enough balance to buy 50 more shares this month.',
      action: 'Buy Shares',
      icon: <Lightbulb className="h-4 w-4" />
    },
    {
      type: 'achievement',
      title: 'Goal Progress',
      description: 'You\'re 64% towards your emergency fund goal!',
      icon: <Award className="h-4 w-4" />
    },
    {
      type: 'warning',
      title: 'High Transaction Fees',
      description: 'You paid UGX 20,000 in fees this month. Consider consolidating transactions.',
      icon: <AlertCircle className="h-4 w-4" />
    }
  ]);

  const totalSpent = spendingData.reduce((sum, item) => sum + item.amount, 0);
  const monthlyGrowth = 12.5; // Percentage

  const getInsightColor = (type: Insight['type']) => {
    switch (type) {
      case 'tip': return 'border-blue-200 bg-blue-50';
      case 'warning': return 'border-orange-200 bg-orange-50';
      case 'achievement': return 'border-green-200 bg-green-50';
      case 'suggestion': return 'border-purple-200 bg-purple-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  const formatProgress = (current: number, target: number) => {
    return Math.round((current / target) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Spending Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Spending Analysis
            </CardTitle>
            <div className="flex gap-1">
              {(['week', 'month', 'year'] as const).map((period) => (
                <Button
                  key={period}
                  variant={timeframe === period ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeframe(period)}
                  className="capitalize"
                >
                  {period}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{formatCurrency(totalSpent)}</span>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">+{monthlyGrowth}%</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {spendingData.map((category, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{category.name}</span>
                    <span className="font-medium">{formatCurrency(category.amount)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${category.color}`}
                        style={{ width: `${category.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-10">
                      {category.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Financial Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {goals.map((goal) => {
              const progress = formatProgress(goal.current, goal.target);
              const daysLeft = Math.ceil(
                (new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              );
              
              return (
                <div key={goal.id} className="space-y-3 p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{goal.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(goal.current)} of {formatCurrency(goal.target)}
                      </p>
                    </div>
                    <Badge variant={progress >= 80 ? 'default' : 'secondary'}>
                      {progress}%
                    </Badge>
                  </div>
                  
                  <Progress value={progress} className="h-2" />
                  
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{daysLeft} days left</span>
                    <span className="capitalize">{goal.category}</span>
                  </div>
                </div>
              );
            })}
            
            <Button variant="outline" className="w-full">
              <Target className="h-4 w-4 mr-2" />
              Add New Goal
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Smart Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Smart Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div 
                key={index} 
                className={`p-4 border rounded-lg ${getInsightColor(insight.type)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded">
                    {insight.icon}
                  </div>
                  <div className="flex-1 space-y-2">
                    <h4 className="font-medium">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {insight.description}
                    </p>
                    {insight.action && (
                      <Button size="sm" variant="outline">
                        {insight.action}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Income</p>
            <p className="text-xl font-bold">{formatCurrency(200000)}</p>
            <p className="text-xs text-green-600">+15% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingDown className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Expenses</p>
            <p className="text-xl font-bold">{formatCurrency(totalSpent)}</p>
            <p className="text-xs text-orange-600">+8% from last month</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WalletInsightsDashboard;