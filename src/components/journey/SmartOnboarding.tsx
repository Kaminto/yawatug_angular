import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useUTMTracking } from '@/hooks/useUTMTracking';
import { useFirstTimeVisitor } from '@/hooks/useFirstTimeVisitor';
import { 
  Wallet, 
  PieChart, 
  TrendingUp, 
  Users,
  ArrowRight,
  Play,
  CheckCircle,
  Target,
  Shield,
  Star
} from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  action: () => void;
  estimatedTime?: string;
}

const SmartOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { utmParams, isFromFacebook } = useUTMTracking();
  const { isFirstTimeVisitor, markWelcomeSeen } = useFirstTimeVisitor();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [userGoals, setUserGoals] = useState({
    investmentAmount: '',
    timeline: '',
    riskTolerance: '',
    focus: searchParams.get('focus') || 'general'
  });

  // Personalized welcome message
  const getWelcomeMessage = () => {
    const source = searchParams.get('source') || utmParams.utm_source;
    
    if (source === 'facebook') {
      return {
        title: `Welcome ${user?.user_metadata?.full_name?.split(' ')[0] || 'Friend'}! 🎉`,
        subtitle: "Your friends from Facebook are building wealth through gold mining. Let's get you started!",
        focusMessage: "Mining-focused investment journey"
      };
    }
    
    return {
      title: `Welcome ${user?.user_metadata?.full_name?.split(' ')[0] || 'Investor'}! 🚀`,
      subtitle: "You're joining thousands of smart investors in African gold mining.",
      focusMessage: "Diversified investment approach"
    };
  };

  const welcomeMsg = getWelcomeMessage();

  // Tutorial steps based on user focus
  const getTutorialSteps = (): OnboardingStep[] => {
    const baseSteps = [
      {
        id: 'welcome',
        title: 'Welcome to Your Investment Journey',
        description: 'Learn how Yawatu works in 2 minutes',
        icon: <Star className="w-6 h-6" />,
        completed: false,
        action: () => setCurrentStep(1),
        estimatedTime: '2 min'
      },
      {
        id: 'wallet',
        title: 'Your Digital Wallet',
        description: 'Secure storage for your funds and earnings',
        icon: <Wallet className="w-6 h-6" />,
        completed: false,
        action: () => navigate('/wallet?tour=true'),
        estimatedTime: '1 min'
      },
      {
        id: 'shares',
        title: 'Gold Mining Shares',
        description: 'Own real mining operations and earn returns',
        icon: <PieChart className="w-6 h-6" />,
        completed: false,
        action: () => navigate('/share-trading?tour=true'),
        estimatedTime: '2 min'
      },
      {
        id: 'earnings',
        title: 'Track Your Earnings',
        description: 'Monitor your passive income and growth',
        icon: <TrendingUp className="w-6 h-6" />,
        completed: false,
        action: () => navigate('/dashboard?focus=earnings'),
        estimatedTime: '1 min'
      }
    ];

    if (userGoals.focus === 'mining') {
      return [
        baseSteps[0],
        {
          id: 'mining-overview',
          title: 'Mining Operations',
          description: 'See live mining data and your stake',
          icon: <Shield className="w-6 h-6" />,
          completed: false,
          action: () => navigate('/projects?focus=mining'),
          estimatedTime: '2 min'
        },
        ...baseSteps.slice(1)
      ];
    }

    return baseSteps;
  };

  const [steps, setSteps] = useState<OnboardingStep[]>(getTutorialSteps());

  const calculateProgress = () => {
    const completedSteps = steps.filter(step => step.completed).length;
    return (completedSteps / steps.length) * 100;
  };

  const handleStepComplete = (stepId: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, completed: true } : step
    ));
  };

  const handleGoalSetting = (goals: Partial<typeof userGoals>) => {
    setUserGoals(prev => ({ ...prev, ...goals }));
    
    // Update steps based on goals
    const updatedSteps = getTutorialSteps();
    setSteps(updatedSteps);
    
    setCurrentStep(1);
  };

  const handleSkipOnboarding = () => {
    markWelcomeSeen();
    toast.info('You can restart the tour anytime from Settings');
    navigate('/dashboard');
  };

  const handleCompleteOnboarding = () => {
    markWelcomeSeen();
    toast.success('Welcome to Yawatu! Start your investment journey now.');
    navigate('/share-trading?highlight=buy');
  };

  // Investment goal setting component
  const InvestmentGoalSetting = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Let's Personalize Your Experience</CardTitle>
        <p className="text-center text-muted-foreground">
          Tell us about your investment goals so we can recommend the best path for you.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">How much would you like to start with?</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {['UGX 10,000', 'UGX 50,000', 'UGX 100,000', 'UGX 500,000+'].map(amount => (
              <Button
                key={amount}
                variant={userGoals.investmentAmount === amount ? 'default' : 'outline'}
                onClick={() => setUserGoals(prev => ({ ...prev, investmentAmount: amount }))}
                className="text-sm"
              >
                {amount}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">What's your investment timeline?</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {['Short-term (< 1 year)', 'Medium-term (1-3 years)', 'Long-term (3+ years)'].map(timeline => (
              <Button
                key={timeline}
                variant={userGoals.timeline === timeline ? 'default' : 'outline'}
                onClick={() => setUserGoals(prev => ({ ...prev, timeline }))}
                className="text-sm"
              >
                {timeline}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Risk tolerance?</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {['Conservative', 'Moderate', 'Aggressive'].map(risk => (
              <Button
                key={risk}
                variant={userGoals.riskTolerance === risk ? 'default' : 'outline'}
                onClick={() => setUserGoals(prev => ({ ...prev, riskTolerance: risk }))}
                className="text-sm"
              >
                {risk}
              </Button>
            ))}
          </div>
        </div>

        <Button 
          onClick={() => handleGoalSetting(userGoals)}
          disabled={!userGoals.investmentAmount || !userGoals.timeline || !userGoals.riskTolerance}
          className="w-full"
        >
          Continue to Tutorial <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="container mx-auto py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{welcomeMsg.title}</h1>
          <p className="text-lg text-muted-foreground mb-4">{welcomeMsg.subtitle}</p>
          <Badge variant="secondary">{welcomeMsg.focusMessage}</Badge>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Your Progress</span>
            <span className="text-sm font-medium">{Math.round(calculateProgress())}% Complete</span>
          </div>
          <Progress value={calculateProgress()} className="w-full" />
        </div>

        {/* Step Content */}
        {currentStep === 0 && <InvestmentGoalSetting />}
        
        {currentStep === 1 && (
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Interactive Tutorial</CardTitle>
              <p className="text-center text-muted-foreground">
                Let's walk through the key features step by step
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div 
                    key={step.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                      step.completed 
                        ? 'bg-primary/5 border-primary/20' 
                        : 'bg-card border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      step.completed ? 'bg-primary/10' : 'bg-muted'
                    }`}>
                      {step.completed ? <CheckCircle className="w-6 h-6 text-primary" /> : step.icon}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-medium">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                      {step.estimatedTime && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Estimated time: {step.estimatedTime}
                        </p>
                      )}
                    </div>
                    
                    <Button
                      onClick={step.action}
                      disabled={step.completed}
                      size="sm"
                      variant={step.completed ? 'secondary' : 'default'}
                    >
                      {step.completed ? 'Completed' : 'Start'} <Play className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 mt-6">
                <Button 
                  onClick={handleSkipOnboarding}
                  variant="ghost"
                  className="flex-1"
                >
                  Skip Tutorial
                </Button>
                <Button 
                  onClick={handleCompleteOnboarding}
                  disabled={calculateProgress() < 75}
                  className="flex-1"
                >
                  Start Investing <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Social proof footer */}
        <div className="text-center mt-8 space-y-2">
          <div className="flex justify-center items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>2,800+ investors</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              <span>Regulated operations</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              <span>Average 12% returns</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Join investors who've earned over UGX 2.5B in returns
          </p>
        </div>
      </div>
    </div>
  );
};

export default SmartOnboarding;