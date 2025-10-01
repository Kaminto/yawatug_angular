import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Wallet, 
  Shield, 
  Smartphone, 
  Target, 
  CheckCircle, 
  ArrowRight,
  CreditCard,
  Send,
  RotateCcw,
  TrendingUp
} from 'lucide-react';
import TwoFactorSetup from '@/components/security/TwoFactorSetup';

interface WalletOnboardingProps {
  onComplete: () => void;
  isFirstTime: boolean;
}

const WalletOnboarding: React.FC<WalletOnboardingProps> = ({ onComplete, isFirstTime }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [securitySetupCompleted, setSecuritySetupCompleted] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const navigate = useNavigate();

      const handleSecuritySetup = (type: 'pin' | '2fa' | 'biometric') => {
        switch (type) {
          case 'pin':
          case '2fa':
          case 'biometric':
            // Navigate to settings page for security setup
            navigate('/settings');
            break;
        }
      };

  const handle2FAComplete = () => {
    setShow2FADialog(false);
    setSecuritySetupCompleted(true);
  };

  const steps = [
    {
      title: "Welcome to Your Yawatu Wallet",
      description: "Your secure digital wallet for all Yawatu transactions",
      icon: <Wallet className="h-12 w-12 text-primary" />,
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <div className="bg-primary/10 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <Wallet className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Your Digital Wallet</h3>
            <p className="text-muted-foreground">
              Manage your funds, buy shares, and track transactions all in one secure place.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <Shield className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <h4 className="font-medium">Bank-Level Security</h4>
              <p className="text-sm text-muted-foreground">256-bit encryption</p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <Smartphone className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <h4 className="font-medium">Mobile Optimized</h4>
              <p className="text-sm text-muted-foreground">Use anywhere</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Wallet Features Overview",
      description: "Discover what you can do with your wallet",
      icon: <Target className="h-12 w-12 text-primary" />,
      content: (
        <div className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <CreditCard className="h-6 w-6 text-green-500 mt-1" />
              <div>
                <h4 className="font-medium">Deposit Funds</h4>
                <p className="text-sm text-muted-foreground">
                  Add money via mobile money, bank transfer, or card
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-500 mt-1" />
              <div>
                <h4 className="font-medium">Buy Shares</h4>
                <p className="text-sm text-muted-foreground">
                  Invest in Yawatu mining shares directly from your wallet
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Send className="h-6 w-6 text-purple-500 mt-1" />
              <div>
                <h4 className="font-medium">Transfer Money</h4>
                <p className="text-sm text-muted-foreground">
                  Send funds to family, friends, or other investors
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <RotateCcw className="h-6 w-6 text-orange-500 mt-1" />
              <div>
                <h4 className="font-medium">Currency Exchange</h4>
                <p className="text-sm text-muted-foreground">
                  Convert between UGX and USD at competitive rates
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Security Setup",
      description: "Secure your wallet with additional protection",
      icon: <Shield className="h-12 w-12 text-primary" />,
      content: (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold">Enhanced Security</h3>
            <p className="text-muted-foreground">
              Set up additional security measures to protect your funds
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Transaction PIN</h4>
                <p className="text-sm text-muted-foreground">4-digit PIN for transactions</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleSecuritySetup('pin')}
              >
                Setup Now
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Two-Factor Authentication</h4>
                <p className="text-sm text-muted-foreground">SMS or app-based 2FA</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleSecuritySetup('2fa')}
              >
                Setup Now
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Biometric Login</h4>
                <p className="text-sm text-muted-foreground">Fingerprint or face unlock</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleSecuritySetup('biometric')}
              >
                Setup Now
              </Button>
            </div>
          </div>
          
          {securitySetupCompleted && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 font-medium">
                ✓ Security setup completed! You can now proceed to your wallet.
              </p>
            </div>
          )}
        </div>
      )
    }
  ];

  const nextStep = () => {
    setCompletedSteps(prev => [...prev, currentStep]);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {steps[currentStep].icon}
                {steps[currentStep].title}
              </CardTitle>
              <p className="text-muted-foreground">{steps[currentStep].description}</p>
            </div>
            <Badge variant="outline">
              Step {currentStep + 1} of {steps.length}
            </Badge>
          </div>
          
          <Progress value={progress} className="mt-4" />
        </CardHeader>
        
        <CardContent className="space-y-6">
          {steps[currentStep].content}
          
          <div className="flex justify-between pt-6 border-t">
            <Button 
              variant="outline" 
              onClick={prevStep} 
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            
            <Button onClick={nextStep} className="flex items-center gap-2">
              {currentStep === steps.length - 1 ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2FA Setup Dialog */}
      <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Two-Factor Authentication Setup</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <TwoFactorSetup />
          </div>
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShow2FADialog(false)}>
              Close
            </Button>
            <Button onClick={handle2FAComplete}>
              Complete Setup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WalletOnboarding;