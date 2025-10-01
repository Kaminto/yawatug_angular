
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { User, Shield, Award } from 'lucide-react';

interface ProfileProgressProps {
  profile: any;
}

const ProfileProgress: React.FC<ProfileProgressProps> = ({ profile }) => {
  const getVerificationLevel = () => {
    if (profile?.status === 'verified') return 'verified';
    if (profile?.status === 'pending') return 'pending';
    return 'unverified';
  };

  const getProgressColor = (level: string) => {
    switch (level) {
      case 'verified': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-300';
    }
  };

  const getVerificationSteps = () => {
    const steps = [
      {
        label: 'Account Created',
        completed: true,
        icon: <User className="h-4 w-4" />
      },
      {
        label: 'Profile Completed',
        completed: (profile?.profile_completion_percentage || 0) >= 80,
        icon: <User className="h-4 w-4" />
      },
      {
        label: 'Documents Submitted',
        completed: profile?.status !== 'unverified',
        icon: <Shield className="h-4 w-4" />
      },
      {
        label: 'Verification Complete',
        completed: profile?.status === 'verified',
        icon: <Award className="h-4 w-4" />
      }
    ];

    return steps;
  };

  const verificationLevel = getVerificationLevel();
  const steps = getVerificationSteps();
  const completedSteps = steps.filter(step => step.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Verification Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">
            {Math.round(profile?.profile_completion_percentage || 0)}%
          </div>
          <Badge 
            variant={verificationLevel === 'verified' ? 'default' : 
                    verificationLevel === 'pending' ? 'secondary' : 'outline'}
          >
            {verificationLevel.charAt(0).toUpperCase() + verificationLevel.slice(1)}
          </Badge>
        </div>

        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {completedSteps} of {steps.length} steps completed
          </p>
        </div>

        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className={`p-1 rounded-full ${step.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                {step.icon}
              </div>
              <span className={`text-sm ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
              {step.completed && (
                <Badge variant="outline" className="ml-auto text-xs">
                  ✓
                </Badge>
              )}
            </div>
          ))}
        </div>

        {verificationLevel !== 'verified' && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              {verificationLevel === 'pending' 
                ? 'Your account is under review. You\'ll be notified once verification is complete.'
                : 'Complete your profile and submit required documents to get verified.'
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfileProgress;
