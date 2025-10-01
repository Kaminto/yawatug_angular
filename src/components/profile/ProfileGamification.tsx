import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Award, Star, Trophy, Target, CheckCircle } from 'lucide-react';

interface ProfileGamificationProps {
  completionPercentage: number;
  achievements?: string[];
  level?: number;
}

const ProfileGamification: React.FC<ProfileGamificationProps> = ({
  completionPercentage,
  achievements = [],
  level = 1
}) => {
  const milestones = [
    { threshold: 25, reward: 'Profile Started', icon: Star, color: 'text-blue-600' },
    { threshold: 50, reward: 'Halfway There', icon: Target, color: 'text-purple-600' },
    { threshold: 75, reward: 'Almost Complete', icon: Trophy, color: 'text-orange-600' },
    { threshold: 100, reward: 'Profile Master', icon: Award, color: 'text-green-600' }
  ];

  const nextMilestone = milestones.find(m => m.threshold > completionPercentage);
  const earnedMilestones = milestones.filter(m => m.threshold <= completionPercentage);

  const getLevelBadge = (level: number) => {
    if (level >= 5) return { label: 'Gold', color: 'bg-yellow-500' };
    if (level >= 3) return { label: 'Silver', color: 'bg-gray-400' };
    return { label: 'Bronze', color: 'bg-orange-600' };
  };

  const levelBadge = getLevelBadge(level);

  return (
    <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-accent" />
              Profile Progress
            </CardTitle>
            <CardDescription className="text-xs">Complete to unlock rewards</CardDescription>
          </div>
          <Badge className={`${levelBadge.color} text-white`}>
            Level {level} - {levelBadge.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Completion</span>
            <span className="text-2xl font-bold text-accent">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-3" />
          {nextMilestone && (
            <p className="text-xs text-muted-foreground mt-2">
              {nextMilestone.threshold - completionPercentage}% until next reward
            </p>
          )}
        </div>

        {/* Earned Milestones */}
        {earnedMilestones.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
              <Trophy className="h-4 w-4 text-accent" />
              Unlocked Rewards
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {earnedMilestones.map((milestone) => {
                const Icon = milestone.icon;
                return (
                  <div 
                    key={milestone.threshold}
                    className="flex items-center gap-2 p-2 rounded-lg border bg-card"
                  >
                    <Icon className={`h-4 w-4 ${milestone.color}`} />
                    <span className="text-xs font-medium truncate">{milestone.reward}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Next Milestone Preview */}
        {nextMilestone && (
          <div className="p-3 rounded-lg border border-accent/30 bg-accent/5">
            <div className="flex items-center gap-2 mb-1">
              <nextMilestone.icon className={`h-4 w-4 ${nextMilestone.color}`} />
              <span className="text-sm font-semibold">Next: {nextMilestone.reward}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Reach {nextMilestone.threshold}% profile completion
            </p>
          </div>
        )}

        {/* Completion Bonus */}
        {completionPercentage === 100 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-700">Profile Complete! 🎉</p>
              <p className="text-xs text-green-600">You've unlocked all verification features</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfileGamification;
