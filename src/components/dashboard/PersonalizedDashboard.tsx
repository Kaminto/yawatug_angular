import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Wallet, 
  Target, 
  Bell,
  ArrowRight,
  Eye,
  EyeOff,
  RefreshCw,
  Star,
  AlertTriangle,
  CheckCircle,
  Lightbulb
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AchievementBadges from '@/components/gamification/AchievementBadges';
import InvestmentClubInvite from '@/components/social/InvestmentClubInvite';

interface PersonalizedDashboardProps {
  userStats?: {
    totalInvestment: number;
    currentValue: number;
    totalReturns: number;
    portfolioGrowth: number;
    shareCount: number;
  };
}

const PersonalizedDashboard: React.FC<PersonalizedDashboardProps> = ({ 
  userStats = {
    totalInvestment: 850000,
    currentValue: 912000,
    totalReturns: 62000,
    portfolioGrowth: 7.3,
    shareCount: 34
  }
}) => {
  const { user } = useAuth();
  const [showValues, setShowValues] = useState(true);
  const [activeInsight, setActiveInsight] = useState(0);

  // Smart insights based on user behavior
  const smartInsights = [
    {
      type: 'opportunity',
      icon: <Lightbulb className="w-4 h-4" />,
      title: 'Perfect Buying Opportunity',
      message: 'Gold prices dipped 2.1% - Consider adding UGX 100K to your portfolio',
      action: 'Invest Now',
      priority: 'high',
      color: 'text-green-600'
    },
    {
      type: 'achievement',
      icon: <Star className="w-4 h-4" />,
      title: 'Goal Progress',
      message: 'You\'re 85% towards your UGX 1M investment goal this quarter',
      action: 'View Progress',
      priority: 'medium',
      color: 'text-blue-600'
    },
    {
      type: 'social',
      icon: <Target className="w-4 h-4" />,
      title: 'Referral Bonus Available',
      message: 'John M. just invested - claim your UGX 25K referral bonus',
      action: 'Claim Bonus',
      priority: 'high',
      color: 'text-purple-600'
    }
  ];

  const nextBestActions = [
    {
      title: 'Complete Profile Verification',
      description: 'Upload ID document to unlock higher investment limits',
      progress: 75,
      reward: 'Up to UGX 5M investment limit',
      action: 'Upload Document',
      urgent: true
    },
    {
      title: 'Set Up Auto-Invest',
      description: 'Automate monthly investments for better returns',
      progress: 0,
      reward: 'Consistent growth strategy',
      action: 'Set Up',
      urgent: false
    },
    {
      title: 'Join Investment Club',
      description: 'Connect with other investors and share insights',
      progress: 40,
      reward: 'Exclusive perks & lower fees',
      action: 'Join Club',
      urgent: false
    }
  ];

  const formatCurrency = (amount: number) => {
    if (!showValues) return '••••••';
    return `UGX ${(amount / 1000).toFixed(0)}K`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.user_metadata?.full_name?.split(' ')[0] || 'Investor';
    
    if (hour < 12) return `Good morning, ${name}!`;
    if (hour < 18) return `Good afternoon, ${name}!`;
    return `Good evening, ${name}!`;
  };

  return (
    <div className="space-y-6">
      {/* Personal Greeting & Quick Stats */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{getGreeting()}</CardTitle>
              <p className="text-muted-foreground">
                Here's your investment summary for today
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowValues(!showValues)}
              >
                {showValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="sm">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(userStats.currentValue)}
              </p>
              <p className="text-sm text-muted-foreground">Portfolio Value</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                +{formatCurrency(userStats.totalReturns)}
              </p>
              <p className="text-sm text-muted-foreground">Total Returns</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {showValues ? `+${userStats.portfolioGrowth}%` : '••••'}
              </p>
              <p className="text-sm text-muted-foreground">Growth (30d)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {showValues ? userStats.shareCount : '••'}
              </p>
              <p className="text-sm text-muted-foreground">Shares Owned</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart Insights Carousel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Smart Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="overflow-hidden">
              <div 
                className="flex transition-transform duration-300 ease-in-out"
                style={{ transform: `translateX(-${activeInsight * 100}%)` }}
              >
                {smartInsights.map((insight, index) => (
                  <div key={index} className="w-full flex-shrink-0">
                    <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                      <div className={`p-2 rounded-lg bg-background ${insight.color}`}>
                        {insight.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground">{insight.message}</p>
                      </div>
                      <Button size="sm" variant="outline">
                        {insight.action}
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Indicators */}
            <div className="flex justify-center gap-2 mt-3">
              {smartInsights.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveInsight(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    activeInsight === index ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Best Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Recommended Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {nextBestActions.map((action, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg border transition-colors ${
                  action.urgent 
                    ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800' 
                    : 'bg-muted/30 border-border'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{action.title}</h4>
                    {action.urgent && (
                      <Badge variant="destructive">
                        Urgent
                      </Badge>
                    )}
                  </div>
                  <Button size="sm" variant={action.urgent ? 'default' : 'outline'}>
                    {action.action}
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  {action.description}
                </p>
                
                {action.progress > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Progress</span>
                      <span>{action.progress}%</span>
                    </div>
                    <Progress value={action.progress} className="h-1.5" />
                  </div>
                )}
                
                <p className="text-xs text-primary font-medium mt-2">
                  Reward: {action.reward}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Achievements Section */}
      <AchievementBadges 
        userAchievements={[]}
        onAchievementClick={(achievement) => {
          console.log('Achievement clicked:', achievement);
        }}
      />

      {/* Social Features */}
      <InvestmentClubInvite 
        userReferrals={2}
        userInvestmentLevel="beginner"
      />

      {/* Performance vs Market */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Performance vs Market
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
              <p className="text-lg font-bold text-green-600">+7.3%</p>
              <p className="text-sm text-muted-foreground">Your Portfolio</p>
              <CheckCircle className="w-4 h-4 text-green-600 mx-auto mt-1" />
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-lg font-bold">+5.1%</p>
              <p className="text-sm text-muted-foreground">Gold Market Avg</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-lg font-bold">+2.8%</p>
              <p className="text-sm text-muted-foreground">Uganda Market</p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-primary/5 rounded-lg">
            <p className="text-sm text-center">
              <span className="font-medium text-primary">Great job!</span> Your portfolio is outperforming the market by 2.2%
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PersonalizedDashboard;