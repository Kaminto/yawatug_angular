import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Mail, Shield, FileText, ArrowRight, Calendar, Gift } from 'lucide-react';

interface NextStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

const RegistrationSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isWelcomeFlow = searchParams.get('welcome') === 'true';
  const [currentStep, setCurrentStep] = useState(0);

  const nextSteps: NextStep[] = [
    {
      icon: <Mail className="h-5 w-5" />,
      title: 'Verify Your Email',
      description: 'Check your inbox and click the verification link to activate your account',
      action: 'Check Email',
      priority: 'high'
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: 'Complete Your Profile',
      description: 'Add personal details and upload documents for faster verification',
      action: 'Complete Profile',
      priority: 'high'
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: 'Set Up Security',
      description: 'Enable two-factor authentication for enhanced account security',
      action: 'Setup Security',
      priority: 'medium'
    },
    {
      icon: <Gift className="h-5 w-5" />,
      title: 'Explore Features',
      description: 'Learn about trading, wallet management, and earning rewards',
      action: 'Take Tour',
      priority: 'low'
    }
  ];

  useEffect(() => {
    // Auto-advance steps for visual effect
    const timer = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % nextSteps.length);
    }, 3000);
    
    return () => clearInterval(timer);
  }, [nextSteps.length]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const handleContinue = () => {
    if (isWelcomeFlow) {
      navigate('/profile?welcome=true');
    } else {
      navigate('/auth?mode=login');
    }
  };

  const handleScheduleReminder = () => {
    // Create calendar event for profile completion
    const event = {
      title: 'Complete YAWATU Profile Setup',
      details: 'Remember to complete your profile and upload required documents for verification',
      start: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      duration: 30 // 30 minutes
    };
    
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&details=${encodeURIComponent(event.details)}`;
    window.open(calendarUrl, '_blank');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 px-4">
      <div className="w-full max-w-2xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">Welcome to YAWATU!</h1>
          <p className="text-lg text-muted-foreground">
            Your account has been successfully created
          </p>
        </div>

        {/* Main Success Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-center">Account Creation Successful</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Success Message */}
            <div className="text-center p-6 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">
                🎉 Congratulations! Your YAWATU account is ready
              </h3>
              <p className="text-green-700 text-sm">
                We've sent a verification email to your inbox. Please verify your email to get started.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-primary/5 rounded-lg">
                <div className="text-2xl font-bold text-primary">0%</div>
                <div className="text-xs text-muted-foreground">Profile Complete</div>
              </div>
              <div className="p-4 bg-secondary/5 rounded-lg">
                <div className="text-2xl font-bold text-secondary">$0</div>
                <div className="text-xs text-muted-foreground">Wallet Balance</div>
              </div>
              <div className="p-4 bg-accent/5 rounded-lg">
                <div className="text-2xl font-bold text-accent">0</div>
                <div className="text-xs text-muted-foreground">Shares Owned</div>
              </div>
            </div>

            {/* Next Steps */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                Your Next Steps
              </h3>
              
              <div className="space-y-3">
                {nextSteps.map((step, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg transition-all ${
                      currentStep === index 
                        ? 'border-primary bg-primary/5 shadow-sm' 
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-background border rounded">
                        {step.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{step.title}</h4>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getPriorityColor(step.priority)} text-white border-0`}
                          >
                            {step.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {step.description}
                        </p>
                        <Button 
                          size="sm" 
                          variant={currentStep === index ? "default" : "outline"}
                          className="text-xs"
                        >
                          {step.action}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Button onClick={handleContinue} className="w-full" size="lg">
                <CheckCircle className="h-4 w-4 mr-2" />
                Continue to {isWelcomeFlow ? 'Profile Setup' : 'Login'}
              </Button>
              
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={handleScheduleReminder}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Set Reminder
                </Button>
                <Button variant="outline" onClick={() => navigate('/help')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Get Help
                </Button>
              </div>
            </div>

            {/* Welcome Bonus Banner */}
            <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-lg text-center">
              <h4 className="font-semibold text-primary mb-1">🎁 Welcome Bonus</h4>
              <p className="text-sm text-muted-foreground">
                Complete your profile within 7 days to unlock your welcome bonus and special offers!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Need help? Visit our{' '}
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/help')}>
              Help Center
            </Button>
            {' '}or contact support
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationSuccess;