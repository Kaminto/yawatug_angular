import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, TrendingUp, Share, Gift, ArrowRight, Hash } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const RegistrationSuccessExpress: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [registrationNumber, setRegistrationNumber] = useState('');

  useEffect(() => {
    const fetchRegistrationNumber = async () => {
      const userId = searchParams.get('userId');
      if (!userId) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('referral_code')
          .eq('id', userId)
          .single();

        if (profile?.referral_code) {
          setRegistrationNumber(profile.referral_code);
        }
      } catch (error) {
        console.error('Error fetching registration number:', error);
      }
    };

    fetchRegistrationNumber();
  }, [searchParams]);

  const shareReferralWhatsApp = () => {
    const message = `Join me on YAWATU - Uganda's premier investment platform! Use my referral link to get started with exclusive benefits: https://yawatug.com/join/express`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-xl">Welcome to YAWATU!</CardTitle>
            <p className="text-muted-foreground">Your account has been created successfully</p>
            
            {registrationNumber && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700">
                  <Hash className="h-4 w-4" />
                  <span className="font-medium">Your Registration Number</span>
                </div>
                <div className="text-xl font-bold text-green-800 mt-1">
                  {registrationNumber}
                </div>
                <p className="text-sm text-green-600 mt-1">
                  This is also your referral code for earning rewards!
                </p>
              </div>
            )}
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Email Verification Notice */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-1">Check your email</h4>
              <p className="text-sm text-blue-700">
                We've sent a verification link to activate your account
              </p>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <h4 className="font-medium">Get started in 3 simple steps:</h4>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-medium">1</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Verify your email</p>
                    <p className="text-xs text-muted-foreground">Click the link we sent you</p>
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
                Share with friends and earn rewards when they invest
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
              
              <Button 
                variant="outline"
                onClick={() => navigate('/auth')}
                className="w-full"
              >
                Sign In Later
              </Button>
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
        </Card>
      </div>
    </div>
  );
};

export default RegistrationSuccessExpress;