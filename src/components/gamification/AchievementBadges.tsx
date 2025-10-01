import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Star, 
  Target, 
  Users, 
  Wallet, 
  TrendingUp,
  Shield,
  Crown
} from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  reward?: string;
  category: 'investment' | 'social' | 'profile' | 'earnings';
}

interface AchievementBadgesProps {
  userAchievements: Achievement[];
  onAchievementClick?: (achievement: Achievement) => void;
}

const AchievementBadges: React.FC<AchievementBadgesProps> = ({ 
  userAchievements = [],
  onAchievementClick 
}) => {
  // Default achievements for demo
  const defaultAchievements: Achievement[] = [
    {
      id: 'first_investment',
      title: 'First Investor',
      description: 'Make your first share purchase',
      icon: <Wallet className="w-5 h-5" />,
      progress: 1,
      maxProgress: 1,
      unlocked: true,
      reward: 'UGX 5,000 bonus',
      category: 'investment'
    },
    {
      id: 'profile_complete',
      title: 'Profile Master',
      description: 'Complete 100% of your profile',
      icon: <Shield className="w-5 h-5" />,
      progress: 85,
      maxProgress: 100,
      unlocked: false,
      reward: 'Reduced transaction fees',
      category: 'profile'
    },
    {
      id: 'referral_champion',
      title: 'Social Connector',
      description: 'Refer 5 successful investors',
      icon: <Users className="w-5 h-5" />,
      progress: 2,
      maxProgress: 5,
      unlocked: false,
      reward: 'UGX 50,000 bonus',
      category: 'social'
    },
    {
      id: 'profit_maker',
      title: 'Profit Maker',
      description: 'Earn UGX 100,000 in returns',
      icon: <TrendingUp className="w-5 h-5" />,
      progress: 45000,
      maxProgress: 100000,
      unlocked: false,
      reward: 'VIP status',
      category: 'earnings'
    },
    {
      id: 'diamond_hands',
      title: 'Diamond Hands',
      description: 'Hold shares for 6+ months',
      icon: <Crown className="w-5 h-5" />,
      progress: 4,
      maxProgress: 6,
      unlocked: false,
      reward: 'Exclusive investment access',
      category: 'investment'
    }
  ];

  const achievements = userAchievements.length > 0 ? userAchievements : defaultAchievements;

  const getCategoryColor = (category: Achievement['category']) => {
    switch (category) {
      case 'investment': return 'bg-primary/10 border-primary/20';
      case 'social': return 'bg-secondary/10 border-secondary/20';
      case 'profile': return 'bg-accent/10 border-accent/20';
      case 'earnings': return 'bg-green-500/10 border-green-500/20';
      default: return 'bg-muted border-border';
    }
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Achievements
          </h3>
          <p className="text-sm text-muted-foreground">
            {unlockedCount} of {achievements.length} unlocked
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Star className="w-3 h-3" />
          {unlockedCount * 100} XP
        </Badge>
      </div>

      {/* Achievement Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {achievements.map((achievement) => (
          <Card 
            key={achievement.id}
            className={`cursor-pointer transition-all hover:scale-105 ${
              achievement.unlocked 
                ? 'bg-primary/5 border-primary/30 shadow-sm' 
                : getCategoryColor(achievement.category)
            }`}
            onClick={() => onAchievementClick?.(achievement)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  achievement.unlocked 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {achievement.unlocked ? (
                    <Trophy className="w-5 h-5" />
                  ) : (
                    achievement.icon
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`font-medium text-sm ${
                      achievement.unlocked ? 'text-primary' : 'text-foreground'
                    }`}>
                      {achievement.title}
                    </h4>
                    {achievement.unlocked && (
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        ✓
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {achievement.description}
                  </p>
                  
                  {!achievement.unlocked && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">
                          {achievement.progress.toLocaleString()} / {achievement.maxProgress.toLocaleString()}
                        </span>
                      </div>
                      <Progress 
                        value={(achievement.progress / achievement.maxProgress) * 100} 
                        className="h-1.5"
                      />
                    </div>
                  )}
                  
                  {achievement.reward && (
                    <p className="text-xs text-primary mt-1 font-medium">
                      Reward: {achievement.reward}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Next Achievement Hint */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Next Achievement</p>
              <p className="text-xs text-muted-foreground">
                Complete your profile to unlock "Profile Master" achievement
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AchievementBadges;