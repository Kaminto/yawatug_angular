import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone,
  ArrowRight,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Zap,
  Clock,
  Users
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface QuickDemoStep {
  id: string;
  title: string;
  description: string;
  visual: React.ReactNode;
  value: string;
  duration: number;
}

const MobileQuickDemo: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [completedValue, setCompletedValue] = useState(0);

  const quickSteps: QuickDemoStep[] = [
    {
      id: 'signup',
      title: 'Quick Sign-Up',
      description: 'Register with just your phone number',
      visual: (
        <div className="bg-green-100 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-semibold">Account Created!</div>
              <div className="text-sm text-green-600">+256 7XX XXX XXX verified</div>
            </div>
          </div>
        </div>
      ),
      value: '2 minutes saved',
      duration: 2000
    },
    {
      id: 'fund',
      title: 'Add Money',
      description: 'Fund instantly with Mobile Money',
      visual: (
        <div className="bg-blue-100 p-4 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {formatCurrency(100000, 'UGX')}
            </div>
            <div className="text-sm text-blue-600">Added via MTN MoMo</div>
            <div className="mt-2 flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Instant transfer</span>
            </div>
          </div>
        </div>
      ),
      value: 'UGX 100,000 ready',
      duration: 2500
    },
    {
      id: 'invest',
      title: 'Buy Shares',
      description: 'Start investing with one tap',
      visual: (
        <div className="bg-orange-100 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <div>
              <div className="font-semibold">Yawatu Shares</div>
              <div className="text-sm text-orange-600">4 shares purchased</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-orange-600">UGX 100,000</div>
              <div className="text-xs text-green-600">+5% today</div>
            </div>
          </div>
          <div className="w-full bg-orange-200 rounded-full h-2">
            <div className="bg-orange-500 h-2 rounded-full w-[75%]"></div>
          </div>
        </div>
      ),
      value: '4 shares owned',
      duration: 3000
    },
    {
      id: 'grow',
      title: 'Watch It Grow',
      description: 'Your investment starts working immediately',
      visual: (
        <div className="bg-green-100 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">UGX 105,000</div>
              <div className="text-sm text-gray-600">Current Value</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">+5%</div>
              <div className="text-sm text-gray-600">Growth</div>
            </div>
          </div>
          <div className="mt-3 text-center">
            <div className="text-sm text-green-600 font-medium">
              ↗️ +UGX 5,000 profit in demo!
            </div>
          </div>
        </div>
      ),
      value: '+UGX 5,000 profit',
      duration: 3000
    }
  ];

  useEffect(() => {
    if (!isRunning) return;

    const timer = setTimeout(() => {
      if (currentStep < quickSteps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        setIsRunning(false);
        setCompletedValue(105000);
      }
    }, quickSteps[currentStep].duration);

    return () => clearTimeout(timer);
  }, [isRunning, currentStep]);

  const startQuickDemo = () => {
    setCurrentStep(0);
    setIsRunning(true);
    setCompletedValue(0);
  };

  const resetDemo = () => {
    setCurrentStep(0);
    setIsRunning(false);
    setCompletedValue(0);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
            <Smartphone className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-bold mb-1">60-Second Demo</h3>
          <p className="text-sm text-muted-foreground">
            See how easy investing is on mobile
          </p>
        </div>

        {/* Demo Content */}
        {!isRunning && currentStep === 0 && completedValue === 0 ? (
          // Start Screen
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-center text-sm">
              <div className="p-3 bg-muted rounded-lg">
                <Clock className="h-5 w-5 mx-auto mb-1" />
                <div className="font-semibold">60 seconds</div>
                <div className="text-muted-foreground">Quick demo</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <Zap className="h-5 w-5 mx-auto mb-1" />
                <div className="font-semibold">Real-time</div>
                <div className="text-muted-foreground">Live simulation</div>
              </div>
            </div>
            <Button onClick={startQuickDemo} className="w-full" size="lg">
              <Play className="h-4 w-4 mr-2" />
              Start Quick Demo
            </Button>
          </div>
        ) : (
          // Demo Running or Completed
          <div className="space-y-4">
            {/* Current Step */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">{currentStep + 1}</span>
                  </div>
                  <span className="font-semibold">{quickSteps[currentStep].title}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {quickSteps[currentStep].value}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {quickSteps[currentStep].description}
              </p>
              
              {quickSteps[currentStep].visual}
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(((currentStep + 1) / quickSteps.length) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${((currentStep + 1) / quickSteps.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Step Indicators */}
            <div className="flex justify-center gap-2">
              {quickSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index <= currentStep ? 'bg-primary' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {/* Completion State */}
            {!isRunning && completedValue > 0 && (
              <div className="text-center space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    🎉 Demo Complete!
                  </div>
                  <div className="text-sm text-green-700">
                    You just made UGX 5,000 profit in 60 seconds
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={resetDemo} variant="outline" size="sm">
                    Try Again
                  </Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    Start Investing
                  </Button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isRunning && (
              <div className="text-center">
                <div className="animate-pulse text-sm text-muted-foreground">
                  Processing step {currentStep + 1}...
                </div>
              </div>
            )}
          </div>
        )}

        {/* Value Proposition */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>5K+ investors</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span>15% avg returns</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              <span>No minimum</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Play: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polygon points="5,3 19,12 5,21" />
  </svg>
);

export default MobileQuickDemo;