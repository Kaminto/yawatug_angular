import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  Target, 
  Shield, 
  PieChart,
  Calculator,
  ArrowRight,
  CheckCircle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface RiskAssessmentData {
  investmentExperience: string;
  riskTolerance: string;
  investmentGoals: string[];
  timeHorizon: string;
  investmentAmount: number;
}

interface RecommendationResult {
  riskScore: number;
  portfolioAllocation: {
    conservative: number;
    moderate: number;
    aggressive: number;
  };
  recommendedAmount: number;
  projectedReturns: {
    monthly: number;
    yearly: number;
  };
  diversificationTips: string[];
}

const InvestmentWizard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [assessmentData, setAssessmentData] = useState<RiskAssessmentData>({
    investmentExperience: '',
    riskTolerance: '',
    investmentGoals: [],
    timeHorizon: '',
    investmentAmount: 50000 // Default UGX 50,000
  });
  
  const [recommendation, setRecommendation] = useState<RecommendationResult | null>(null);

  const focus = searchParams.get('focus') || 'general';
  
  const steps = [
    {
      id: 1,
      title: 'Investment Experience',
      description: 'Tell us about your investing background'
    },
    {
      id: 2,
      title: 'Risk Assessment',
      description: 'How comfortable are you with risk?'
    },
    {
      id: 3,
      title: 'Investment Goals',
      description: 'What are you hoping to achieve?'
    },
    {
      id: 4,
      title: 'Amount & Timeline',
      description: 'How much and for how long?'
    },
    {
      id: 5,
      title: 'Your Recommendation',
      description: 'Personalized investment strategy'
    }
  ];

  const calculateRecommendation = (): RecommendationResult => {
    let riskScore = 0;
    
    // Calculate risk score based on assessment
    if (assessmentData.investmentExperience === 'beginner') riskScore += 1;
    else if (assessmentData.investmentExperience === 'intermediate') riskScore += 2;
    else if (assessmentData.investmentExperience === 'advanced') riskScore += 3;
    
    if (assessmentData.riskTolerance === 'conservative') riskScore += 1;
    else if (assessmentData.riskTolerance === 'moderate') riskScore += 2;
    else if (assessmentData.riskTolerance === 'aggressive') riskScore += 3;
    
    if (assessmentData.timeHorizon === 'short') riskScore += 1;
    else if (assessmentData.timeHorizon === 'medium') riskScore += 2;
    else if (assessmentData.timeHorizon === 'long') riskScore += 3;

    // Portfolio allocation based on risk score
    let portfolioAllocation;
    if (riskScore <= 4) {
      portfolioAllocation = { conservative: 70, moderate: 25, aggressive: 5 };
    } else if (riskScore <= 7) {
      portfolioAllocation = { conservative: 40, moderate: 45, aggressive: 15 };
    } else {
      portfolioAllocation = { conservative: 20, moderate: 40, aggressive: 40 };
    }

    // Projected returns (conservative estimates)
    const annualReturn = riskScore <= 4 ? 8 : riskScore <= 7 ? 12 : 18;
    const monthlyReturn = (assessmentData.investmentAmount * annualReturn) / (100 * 12);
    const yearlyReturn = (assessmentData.investmentAmount * annualReturn) / 100;

    const diversificationTips = [
      'Start with smaller amounts to test the waters',
      'Consider spreading investments across different mining projects',
      'Monitor your investments monthly and adjust as needed',
      'Reinvest dividends to compound your returns'
    ];

    return {
      riskScore,
      portfolioAllocation,
      recommendedAmount: assessmentData.investmentAmount,
      projectedReturns: {
        monthly: monthlyReturn,
        yearly: yearlyReturn
      },
      diversificationTips
    };
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    } else if (currentStep === 4) {
      const result = calculateRecommendation();
      setRecommendation(result);
      setCurrentStep(5);
    }
  };

  const handleStartInvesting = async () => {
    if (!user || !recommendation) return;
    
    setLoading(true);
    try {
      // TODO: Save investment preferences to database when table is created
      toast.success('Investment recommendation ready!');
      
      // Navigate to share trading with highlights
      navigate(`/share-trading?wizard=complete&amount=${recommendation.recommendedAmount}&focus=${focus}`);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">How would you describe your investment experience?</h3>
            <div className="space-y-3">
              {[
                { value: 'beginner', label: 'New to Investing', desc: 'I\'m just getting started with investments' },
                { value: 'intermediate', label: 'Some Experience', desc: 'I\'ve made some investments before' },
                { value: 'advanced', label: 'Experienced', desc: 'I regularly invest and understand markets' }
              ].map(option => (
                <Button
                  key={option.value}
                  variant={assessmentData.investmentExperience === option.value ? 'default' : 'outline'}
                  onClick={() => setAssessmentData(prev => ({ ...prev, investmentExperience: option.value }))}
                  className="w-full justify-start h-auto p-4"
                >
                  <div className="text-left">
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-muted-foreground">{option.desc}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">What's your comfort level with investment risk?</h3>
            <div className="space-y-3">
              {[
                { value: 'conservative', label: 'Conservative', desc: 'I prefer steady, predictable returns' },
                { value: 'moderate', label: 'Moderate', desc: 'I want balance between growth and safety' },
                { value: 'aggressive', label: 'Aggressive', desc: 'I\'m willing to take risks for higher returns' }
              ].map(option => (
                <Button
                  key={option.value}
                  variant={assessmentData.riskTolerance === option.value ? 'default' : 'outline'}
                  onClick={() => setAssessmentData(prev => ({ ...prev, riskTolerance: option.value }))}
                  className="w-full justify-start h-auto p-4"
                >
                  <div className="text-left">
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-muted-foreground">{option.desc}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">What are your main investment goals? (Select all that apply)</h3>
            <div className="space-y-3">
              {[
                { value: 'passive_income', label: 'Generate Passive Income' },
                { value: 'wealth_building', label: 'Long-term Wealth Building' },
                { value: 'portfolio_diversification', label: 'Diversify My Portfolio' },
                { value: 'inflation_hedge', label: 'Protect Against Inflation' },
                { value: 'retirement_planning', label: 'Plan for Retirement' }
              ].map(goal => (
                <Button
                  key={goal.value}
                  variant={assessmentData.investmentGoals.includes(goal.value) ? 'default' : 'outline'}
                  onClick={() => {
                    setAssessmentData(prev => ({
                      ...prev,
                      investmentGoals: prev.investmentGoals.includes(goal.value)
                        ? prev.investmentGoals.filter(g => g !== goal.value)
                        : [...prev.investmentGoals, goal.value]
                    }));
                  }}
                  className="w-full justify-start"
                >
                  {goal.label}
                </Button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Investment Amount</h3>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    UGX {assessmentData.investmentAmount.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Starting investment amount</div>
                </div>
                <Slider
                  value={[assessmentData.investmentAmount]}
                  onValueChange={([value]) => setAssessmentData(prev => ({ ...prev, investmentAmount: value }))}
                  min={10000}
                  max={1000000}
                  step={10000}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>UGX 10K</span>
                  <span>UGX 1M</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Investment Timeline</h3>
              <div className="space-y-3">
                {[
                  { value: 'short', label: 'Short-term (< 1 year)', desc: 'Quick returns preferred' },
                  { value: 'medium', label: 'Medium-term (1-3 years)', desc: 'Balanced approach' },
                  { value: 'long', label: 'Long-term (3+ years)', desc: 'Maximum growth potential' }
                ].map(option => (
                  <Button
                    key={option.value}
                    variant={assessmentData.timeHorizon === option.value ? 'default' : 'outline'}
                    onClick={() => setAssessmentData(prev => ({ ...prev, timeHorizon: option.value }))}
                    className="w-full justify-start h-auto p-4"
                  >
                    <div className="text-left">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.desc}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );

      case 5:
        if (!recommendation) return null;
        
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Your Personalized Investment Strategy</h3>
              <p className="text-muted-foreground">Based on your risk profile and goals</p>
            </div>

            {/* Risk Score */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium">Risk Score</span>
                  <Badge variant={recommendation.riskScore <= 4 ? 'secondary' : recommendation.riskScore <= 7 ? 'default' : 'destructive'}>
                    {recommendation.riskScore}/9
                  </Badge>
                </div>
                <Progress value={(recommendation.riskScore / 9) * 100} />
              </CardContent>
            </Card>

            {/* Projected Returns */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      UGX {recommendation.projectedReturns.monthly.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Est. Monthly Return</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-secondary">
                      UGX {recommendation.projectedReturns.yearly.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Est. Annual Return</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Portfolio Allocation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Recommended Portfolio Allocation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Conservative Mining Projects</span>
                    <span className="font-medium">{recommendation.portfolioAllocation.conservative}%</span>
                  </div>
                  <Progress value={recommendation.portfolioAllocation.conservative} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span>Moderate Risk Projects</span>
                    <span className="font-medium">{recommendation.portfolioAllocation.moderate}%</span>
                  </div>
                  <Progress value={recommendation.portfolioAllocation.moderate} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span>High Growth Projects</span>
                    <span className="font-medium">{recommendation.portfolioAllocation.aggressive}%</span>
                  </div>
                  <Progress value={recommendation.portfolioAllocation.aggressive} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Investment Tips for You
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {recommendation.diversificationTips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Button 
              onClick={handleStartInvesting}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'Setting Up...' : 'Start My Investment Journey'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1: return assessmentData.investmentExperience !== '';
      case 2: return assessmentData.riskTolerance !== '';
      case 3: return assessmentData.investmentGoals.length > 0;
      case 4: return assessmentData.timeHorizon !== '' && assessmentData.investmentAmount >= 10000;
      default: return true;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-4">Please Sign In</h2>
            <p className="text-muted-foreground mb-6">You need to be signed in to use the investment wizard</p>
            <Button onClick={() => navigate('/auth')}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="container mx-auto py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Smart Investment Wizard</h1>
          <p className="text-muted-foreground">
            Get personalized recommendations based on your profile and goals
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Step {currentStep} of {steps.length}</span>
            <span className="text-sm font-medium">{Math.round((currentStep / steps.length) * 100)}% Complete</span>
          </div>
          <Progress value={(currentStep / steps.length) * 100} />
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].title}</CardTitle>
            <p className="text-muted-foreground">{steps[currentStep - 1].description}</p>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
            
            {currentStep < 5 && (
              <div className="flex gap-4 mt-6">
                <Button
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  variant="outline"
                  className="flex-1"
                  disabled={currentStep === 1}
                >
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1"
                  disabled={!isStepValid()}
                >
                  {currentStep === 4 ? 'Get Recommendation' : 'Next'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InvestmentWizard;