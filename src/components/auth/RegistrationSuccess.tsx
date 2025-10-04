import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, TrendingUp, Share, Gift, ArrowRight, Hash } from 'lucide-react';

interface RegistrationSuccessProps {
  registrationNumber: string;
  registrationMethod: 'email' | 'phone';
  email?: string;
  phone?: string;
  variant?: 'modal' | 'page';
  onClose?: () => void;
}

export const RegistrationSuccess: React.FC<RegistrationSuccessProps> = ({
  registrationNumber,
  registrationMethod,
  email,
  phone,
  variant = 'page',
  onClose
}) => {
  const navigate = useNavigate();

  const shareReferralWhatsApp = () => {
    const message = `Join me on YAWATU - Uganda's premier investment platform! Use my referral code ${registrationNumber} to get started: https://yawatug.com/register?ref=${registrationNumber}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const content = (
    <>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-primary/10">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-xl">Welcome to YAWATU!</CardTitle>
        <p className="text-muted-foreground">Your account has been created successfully</p>
        
        {registrationNumber && (
          <div className="mt-4 p-4 bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/20 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-primary mb-2">
              <Hash className="h-5 w-5" />
              <span className="font-medium">Your Registration Number</span>
            </div>
            <div className="text-3xl font-bold text-primary">
              {registrationNumber}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              You are member #{registrationNumber.replace('YWT', '')} 
            </p>
            <p className="text-xs text-muted-foreground">
              Save this number - it's also your referral code for earning rewards!
            </p>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Verification Notice */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-1">
            {registrationMethod === 'email' ? 'Check your email' : 'Verify your phone'}
          </h4>
          <p className="text-sm text-blue-700">
            {registrationMethod === 'email' 
              ? `We've sent a verification link to ${email || 'your email'}`
              : `We've sent a verification code to ${phone || 'your phone'}`
            }
          </p>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h4 className="font-medium">Get started in 3 simple steps:</h4>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-medium">1</div>
              <div className="flex-1">
                <p className="font-medium text-sm">Verify your {registrationMethod}</p>
                <p className="text-xs text-muted-foreground">
                  {registrationMethod === 'email' ? 'Click the link we sent' : 'Enter the code we sent'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center font-medium">2</div>
              <div className="flex-1">
                <p className="font-medium text-sm">Complete your profile</p>
                <p className="text-xs text-muted-foreground">Add documents for verification</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center font-medium">3</div>
              <div className="flex-1">
                <p className="font-medium text-sm">Start investing</p>
                <p className="text-xs text-muted-foreground">Buy your first shares</p>
              </div>
            </div>
          </div>
        </div>

        {/* Referral Rewards */}
        <div className="p-4 bg-gradient-to-r from-secondary/10 to-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="h-4 w-4 text-primary" />
            <h4 className="font-medium text-primary">Earn Bonus Rewards</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Share {registrationNumber} with friends and earn rewards when they invest
          </p>
          <Button
            variant="outline"
            onClick={shareReferralWhatsApp}
            className="w-full flex items-center gap-2"
            size="sm"
          >
            <Share className="h-4 w-4" />
            Share & Earn Now
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={() => navigate('/dashboard')}
            className="w-full h-12 flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Go to Dashboard
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
          
          {variant === 'modal' && onClose && (
            <Button 
              variant="outline"
              onClick={onClose}
              className="w-full"
            >
              Close
            </Button>
          )}
        </div>

        {/* Support */}
        <div className="text-center pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-2">
            Need help getting started?
          </p>
          <Button 
            variant="link" 
            className="p-0 h-auto text-sm"
            onClick={() => window.open('https://wa.me/256700000000', '_blank')}
          >
            Contact Support on WhatsApp
          </Button>
        </div>
      </CardContent>
    </>
  );

  if (variant === 'modal') {
    return <Card className="w-full">{content}</Card>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 px-4">
      <div className="w-full max-w-md">
        <Card>{content}</Card>
      </div>
    </div>
  );
};

export default RegistrationSuccess;
