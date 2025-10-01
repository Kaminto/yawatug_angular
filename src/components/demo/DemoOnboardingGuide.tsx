import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight,
  CheckCircle,
  Info,
  Lightbulb,
  Target,
  Clock,
  Users,
  Smartphone,
  DollarSign,
  TrendingUp
} from 'lucide-react';

interface DemoGuideProps {
  onComplete: () => void;
}

const DemoOnboardingGuide: React.FC<DemoGuideProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const guideSteps = [
    {
      title: 'Welcome to Yawatu Demo',
      description: 'Get ready to experience the future of mobile investing in Uganda',
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">What You'll Experience</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium text-blue-900">Real User Journey</div>
                <div className="text-sm text-blue-700">From signup to profit</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium text-green-900">Live Simulations</div>
                <div className="text-sm text-green-700">See real results</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <div>
                <div className="font-medium text-purple-900">No Risk</div>
                <div className="text-sm text-purple-700">Safe demo environment</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <div className="font-medium text-orange-900">Quick & Easy</div>
                <div className="text-sm text-orange-700">2-5 minutes only</div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Choose Your Demo Type',
      description: 'Select the experience that matches your needs and time',
      content: (
        <div className="space-y-4">
          <div className="grid gap-4">
            <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">Interactive Journey</h4>
                    <Badge variant="secondary">Recommended</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Step-by-step personalized demo based on your user type
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>🎯 Personalized</span>
                    <span>⏱️ 3-5 minutes</span>
                    <span>📱 Mobile optimized</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">60-Second Quick Demo</h4>
                    <Badge variant="outline">Fast</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    See the power of mobile investing in just one minute
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>⚡ Super fast</span>
                    <span>⏱️ 1 minute</span>
                    <span>🎯 Core features</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Target className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">Technical Deep Dive</h4>
                    <Badge variant="outline">Advanced</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Comprehensive simulation with all features and capabilities
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>🔧 Technical</span>
                    <span>⏱️ 10+ minutes</span>
                    <span>📊 Detailed data</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'What Makes Yawatu Special?',
      description: 'Understand why thousands of Ugandans choose Yawatu for investing',
      content: (
        <div className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Smartphone className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold">Mobile-First Design</h4>
                <p className="text-sm text-muted-foreground">
                  Built specifically for Ugandan mobile users - works perfectly on your phone
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold">No Minimum Investment</h4>
                <p className="text-sm text-muted-foreground">
                  Start with as little as UGX 10,000 - invest what you can afford
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold">Real Mining Investments</h4>
                <p className="text-sm text-muted-foreground">
                  Your money goes into actual mining operations - real assets, real returns
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <h4 className="font-semibold">Community-Driven</h4>
                <p className="text-sm text-muted-foreground">
                  Earn from referrals, become an agent, grow together with your network
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-primary mb-1">5,000+</div>
            <div className="text-sm text-muted-foreground">
              Ugandans already building wealth with Yawatu
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Ready to Explore?',
      description: 'You\'re all set to experience the future of investing in Uganda',
      content: (
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-white" />
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-2">You're Ready!</h3>
            <p className="text-muted-foreground">
              You now understand what Yawatu offers and how the demo works. 
              Choose your preferred demo experience and see how easy investing can be.
            </p>
          </div>
          
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Safe demo environment</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>No real money involved</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Skip anytime</span>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-left">
                <div className="font-medium text-blue-900 mb-1">Pro Tip</div>
                <div className="text-sm text-blue-700">
                  Try the Interactive Journey first - it's personalized to your situation 
                  and shows exactly how Yawatu fits into your life.
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const nextStep = () => {
    if (currentStep < guideSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const skipGuide = () => {
    onComplete();
  };

  const currentGuideStep = guideSteps[currentStep];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline">
            Step {currentStep + 1} of {guideSteps.length}
          </Badge>
          <Button variant="ghost" size="sm" onClick={skipGuide}>
            Skip Guide
          </Button>
        </div>
        <CardTitle>{currentGuideStep.title}</CardTitle>
        <p className="text-muted-foreground">{currentGuideStep.description}</p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / guideSteps.length) * 100}%` }}
          />
        </div>
        
        {/* Current Step Content */}
        <div className="min-h-[300px]">
          {currentGuideStep.content}
        </div>
        
        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          
          <div className="flex items-center gap-2">
            {guideSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === currentStep
                    ? 'bg-primary scale-125'
                    : index < currentStep
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          
          <Button onClick={nextStep}>
            {currentStep === guideSteps.length - 1 ? (
              'Start Demo'
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DemoOnboardingGuide;