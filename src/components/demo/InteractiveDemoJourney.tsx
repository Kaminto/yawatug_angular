import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  ArrowRight, 
  ArrowLeft,
  Smartphone,
  Wallet,
  TrendingUp,
  Users,
  Award,
  CheckCircle,
  DollarSign,
  Clock,
  Star,
  Target,
  Gift,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface DemoStep {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
  mockData: any;
  duration: number;
}

const InteractiveDemoJourney: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [demoData, setDemoData] = useState<any>({});
  const [selectedUserType, setSelectedUserType] = useState<'student' | 'worker' | 'entrepreneur' | null>(null);

  const demoSteps: DemoStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Yawatu',
      subtitle: 'Your Digital Investment Journey Starts Here',
      description: 'Experience how easy it is to start investing with just your mobile phone. No complex paperwork, no minimum amounts.',
      icon: <Smartphone className="h-8 w-8" />,
      color: 'bg-blue-500',
      features: ['Mobile-first design', 'Quick registration', 'No minimum investment'],
      mockData: { userType: selectedUserType },
      duration: 3000
    },
    {
      id: 'registration',
      title: 'Quick Sign-Up',
      subtitle: 'Get started in under 2 minutes',
      description: 'Simply provide your phone number and basic details. We use SMS verification to keep things secure and simple.',
      icon: <Users className="h-8 w-8" />,
      color: 'bg-green-500',
      features: ['SMS verification', 'Basic info only', 'Instant activation'],
      mockData: { 
        phone: '+256 7XX XXX XXX',
        name: 'Demo User',
        status: 'Verified ✓'
      },
      duration: 4000
    },
    {
      id: 'wallet',
      title: 'Mobile Money Integration',
      subtitle: 'Fund your account instantly',
      description: 'Add money using MTN Mobile Money, Airtel Money, or bank transfer. Your digital wallet is ready immediately.',
      icon: <Wallet className="h-8 w-8" />,
      color: 'bg-purple-500',
      features: ['MTN Mobile Money', 'Airtel Money', 'Bank transfers', 'Instant funding'],
      mockData: {
        balance: 500000,
        currency: 'UGX',
        transactions: [
          { type: 'deposit', amount: 500000, method: 'MTN Mobile Money', status: 'completed' }
        ]
      },
      duration: 5000
    },
    {
      id: 'investment',
      title: 'Start Investing',
      subtitle: 'Buy shares with just a few taps',
      description: 'Purchase shares in Yawatu mining operations. Start small, grow your portfolio over time.',
      icon: <TrendingUp className="h-8 w-8" />,
      color: 'bg-orange-500',
      features: ['No minimum amount', 'Real mining shares', 'Instant purchase', 'Portfolio tracking'],
      mockData: {
        sharesOwned: 15,
        shareValue: 375000,
        totalInvested: 350000,
        profit: 25000,
        profitPercentage: 7.1
      },
      duration: 6000
    },
    {
      id: 'referrals',
      title: 'Earn from Referrals',
      subtitle: 'Share and earn together',
      description: 'Invite friends and family. When they invest, you both benefit. Build your network, grow your wealth.',
      icon: <Gift className="h-8 w-8" />,
      color: 'bg-pink-500',
      features: ['Referral bonuses', 'Friend rewards', 'Network building', 'Passive income'],
      mockData: {
        referralCode: 'YWT2024',
        friendsReferred: 8,
        bonusEarned: 125000,
        pendingBonus: 35000
      },
      duration: 4000
    },
    {
      id: 'growth',
      title: 'Watch Your Money Grow',
      subtitle: 'Track your investment journey',
      description: 'Monitor your portfolio performance, receive dividends, and watch your investments compound over time.',
      icon: <Star className="h-8 w-8" />,
      color: 'bg-yellow-500',
      features: ['Real-time tracking', 'Dividend payments', 'Performance analytics', 'Growth projections'],
      mockData: {
        totalValue: 1250000,
        monthlyGrowth: 12.5,
        dividendsReceived: 45000,
        projectedAnnualReturn: 180000
      },
      duration: 5000
    }
  ];

  const userTypeCards = [
    {
      type: 'student' as const,
      title: 'Student',
      description: 'Start investing with pocket money',
      icon: <Target className="h-6 w-6" />,
      color: 'bg-blue-100 text-blue-700',
      scenario: 'Save UGX 20,000/month → Grow to UGX 500,000+ in 2 years'
    },
    {
      type: 'worker' as const,
      title: 'Employed',
      description: 'Build wealth from your salary',
      icon: <Award className="h-6 w-6" />,
      color: 'bg-green-100 text-green-700',
      scenario: 'Invest UGX 100,000/month → Build UGX 2M+ portfolio'
    },
    {
      type: 'entrepreneur' as const,
      title: 'Business Owner',
      description: 'Diversify your income streams',
      icon: <Zap className="h-6 w-6" />,
      color: 'bg-purple-100 text-purple-700',
      scenario: 'Invest profits → Create passive income streams'
    }
  ];

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || currentStep >= demoSteps.length - 1) return;

    const timer = setTimeout(() => {
      nextStep();
    }, demoSteps[currentStep].duration);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep]);

  const nextStep = () => {
    if (currentStep < demoSteps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(prev => prev + 1);
    } else {
      setIsPlaying(false);
      setCompletedSteps(prev => new Set([...prev, currentStep]));
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const startDemo = () => {
    if (!selectedUserType) {
      toast.error('Please select your user type first');
      return;
    }
    setIsPlaying(true);
    setCurrentStep(0);
    setCompletedSteps(new Set());
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const currentStepData = demoSteps[currentStep];
  const progress = ((currentStep + 1) / demoSteps.length) * 100;

  const renderStepContent = () => {
    switch (currentStepData.id) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
              <Smartphone className="h-12 w-12 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Ready to Start Investing?</h2>
              <p className="text-muted-foreground">Join thousands of Ugandans building wealth through mining investments</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">5K+</div>
                <div className="text-sm text-muted-foreground">Active Investors</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">15%</div>
                <div className="text-sm text-muted-foreground">Avg. Returns</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">24/7</div>
                <div className="text-sm text-muted-foreground">Mobile Access</div>
              </div>
            </div>
          </div>
        );

      case 'registration':
        return (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold">Account Created Successfully!</div>
                  <div className="text-sm text-muted-foreground">Verification complete</div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span className="font-mono">{currentStepData.mockData.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span>Name:</span>
                  <span>{currentStepData.mockData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge variant="default">{currentStepData.mockData.status}</Badge>
                </div>
              </div>
            </div>
          </div>
        );

      case 'wallet':
        return (
          <div className="space-y-6">
            <div className="bg-white border rounded-lg p-6">
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-primary">
                  {formatCurrency(currentStepData.mockData.balance, 'UGX')}
                </div>
                <div className="text-muted-foreground">Available Balance</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">Deposit Successful</div>
                    <div className="text-sm text-muted-foreground">MTN Mobile Money</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      +{formatCurrency(currentStepData.mockData.transactions[0].amount, 'UGX')}
                    </div>
                    <div className="text-xs text-muted-foreground">Just now</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'investment':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border rounded-lg p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {currentStepData.mockData.sharesOwned}
                  </div>
                  <div className="text-sm text-muted-foreground">Shares Owned</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    +{currentStepData.mockData.profitPercentage}%
                  </div>
                  <div className="text-sm text-muted-foreground">Returns</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Portfolio Value:</span>
                  <span className="font-semibold">{formatCurrency(currentStepData.mockData.shareValue, 'UGX')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Invested:</span>
                  <span>{formatCurrency(currentStepData.mockData.totalInvested, 'UGX')}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Profit:</span>
                  <span className="font-semibold">+{formatCurrency(currentStepData.mockData.profit, 'UGX')}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'referrals':
        return (
          <div className="space-y-6">
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-6">
              <div className="text-center mb-4">
                <div className="text-lg font-semibold">Your Referral Code</div>
                <div className="text-2xl font-mono font-bold text-pink-600 bg-white p-2 rounded border">
                  {currentStepData.mockData.referralCode}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-xl font-bold text-pink-600">
                    {currentStepData.mockData.friendsReferred}
                  </div>
                  <div className="text-sm text-muted-foreground">Friends Referred</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrency(currentStepData.mockData.bonusEarned, 'UGX')}
                  </div>
                  <div className="text-sm text-muted-foreground">Bonus Earned</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'growth':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border rounded-lg p-6">
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-yellow-600">
                  {formatCurrency(currentStepData.mockData.totalValue, 'UGX')}
                </div>
                <div className="text-muted-foreground">Total Portfolio Value</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    +{currentStepData.mockData.monthlyGrowth}%
                  </div>
                  <div className="text-sm text-muted-foreground">Monthly Growth</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-lg font-bold text-blue-600">
                    {formatCurrency(currentStepData.mockData.projectedAnnualReturn, 'UGX')}
                  </div>
                  <div className="text-sm text-muted-foreground">Projected Annual</div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!selectedUserType) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Choose Your Investment Journey</CardTitle>
          <p className="text-muted-foreground">
            Select the path that best describes you to see a personalized demo
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {userTypeCards.map((card) => (
              <div
                key={card.type}
                onClick={() => setSelectedUserType(card.type)}
                className="p-6 border rounded-lg cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary"
              >
                <div className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center mb-4`}>
                  {card.icon}
                </div>
                <h3 className="font-semibold mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{card.description}</p>
                <div className="text-xs bg-muted p-2 rounded">
                  <strong>Example:</strong> {card.scenario}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <Button 
              onClick={startDemo} 
              size="lg" 
              disabled={!selectedUserType}
              className="px-8"
            >
              Start Interactive Demo
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Badge variant="outline">{selectedUserType} Journey</Badge>
              <p className="text-sm text-muted-foreground mt-1">
                Step {currentStep + 1} of {demoSteps.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={prevStep} disabled={currentStep === 0}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={togglePlayPause}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={nextStep} disabled={currentStep === demoSteps.length - 1}>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Progress value={progress} className="w-full" />
        </CardContent>
      </Card>

      {/* Main Demo Content */}
      <Card>
        <CardHeader className="text-center">
          <div className={`w-16 h-16 ${currentStepData.color} rounded-full flex items-center justify-center mx-auto mb-4 text-white`}>
            {currentStepData.icon}
          </div>
          <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
          <p className="text-lg font-medium text-primary">{currentStepData.subtitle}</p>
          <p className="text-muted-foreground">{currentStepData.description}</p>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
          
          {/* Features List */}
          <div className="mt-6 grid grid-cols-2 gap-2">
            {currentStepData.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <div className="flex items-center gap-2">
              {demoSteps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-200 ${
                    index === currentStep
                      ? 'bg-primary scale-125'
                      : completedSteps.has(index)
                      ? 'bg-green-500'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completion CTA */}
      {currentStep === demoSteps.length - 1 && (
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
          <CardContent className="pt-6 text-center">
            <h3 className="text-xl font-bold mb-2">Ready to Start Your Journey?</h3>
            <p className="text-muted-foreground mb-4">
              Join thousands of Ugandans building wealth through smart investments
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="px-8">
                Create Account Now
              </Button>
              <Button variant="outline" size="lg" onClick={() => setSelectedUserType(null)}>
                Try Different Journey
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InteractiveDemoJourney;