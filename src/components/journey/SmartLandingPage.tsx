import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useUTMTracking } from '@/hooks/useUTMTracking';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  Users, 
  Shield, 
  Star, 
  ArrowRight, 
  Facebook,
  Twitter,
  Linkedin,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface SmartLandingPageProps {
  onContinueJourney?: () => void;
}

const SmartLandingPage: React.FC<SmartLandingPageProps> = ({ onContinueJourney }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { utmParams, trackingData, isFromFacebook, isFromSocialMedia, getReferralCode } = useUTMTracking();
  const [loading, setLoading] = useState(false);
  const [socialProof, setSocialProof] = useState({
    totalInvestors: 2847,
    todayJoined: 23,
    recentInvestments: 156
  });

  // Personalized content based on UTM source
  const getPersonalizedContent = () => {
    if (isFromFacebook()) {
      return {
        headline: "Join 2,800+ Smart Miners Building Wealth",
        subheadline: "Your Facebook friends are already earning passive income through gold mining shares",
        primaryCTA: "Start Mining Journey",
        focusArea: "mining",
        socialIcon: <Facebook className="w-5 h-5" />,
        benefits: [
          "Direct gold mining returns",
          "Monthly passive income",
          "Transparent mining operations"
        ]
      };
    } else if (isFromSocialMedia()) {
      return {
        headline: "Smart Investment in African Gold Mining",
        subheadline: "Diversify your portfolio with real gold mining shares",
        primaryCTA: "Explore Investment",
        focusArea: "investment",
        socialIcon: <TrendingUp className="w-5 h-5" />,
        benefits: [
          "Diversified mining portfolio",
          "ESG-compliant operations",
          "Growing market opportunity"
        ]
      };
    }
    
    return {
      headline: "Invest in the Future of Gold Mining",
      subheadline: "Join thousands building wealth through sustainable mining",
      primaryCTA: "Start Investing",
      focusArea: "general",
      socialIcon: <Star className="w-5 h-5" />,
      benefits: [
        "Professional mining operations",
        "Regulated and transparent",
        "Community-driven growth"
      ]
    };
  };

  const content = getPersonalizedContent();
  
  // Check if this is a social login callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isSocialCallback = urlParams.get('social') === 'true';
    const provider = urlParams.get('provider');
    
    if (isSocialCallback && provider) {
      console.log(`OAuth callback detected for ${provider}`);
    }
  }, []);
  
  // Redirect authenticated users to appropriate flow
  useEffect(() => {
    if (user) {
      const urlParams = new URLSearchParams(window.location.search);
      const isSocialCallback = urlParams.get('social') === 'true';
      const isActivationCallback = urlParams.get('activated') === 'true';
      
      if (isSocialCallback) {
        navigate(`/onboarding?source=${utmParams.utm_source || 'social'}&focus=${content.focusArea}`);
      } else if (isActivationCallback) {
        // Account was just activated, redirect to profile completion
        navigate('/profile?setup=true');
      }
    }
  }, [user, navigate, utmParams.utm_source, content.focusArea]);

  const handleSocialLogin = async (provider: 'facebook' | 'google' | 'twitter') => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/smart-landing?social=true&provider=${provider}`,
          queryParams: {
            utm_source: utmParams.utm_source || '',
            utm_campaign: utmParams.utm_campaign || '',
            ref: getReferralCode() || ''
          }
        }
      });

      if (error) {
        toast.error(`${provider} login failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Social login error:', error);
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExpressRegister = () => {
    const params = new URLSearchParams();
    if (utmParams.utm_source) params.set('utm_source', utmParams.utm_source);
    if (utmParams.utm_campaign) params.set('utm_campaign', utmParams.utm_campaign);
    if (getReferralCode()) params.set('ref', getReferralCode()!);
    params.set('focus', content.focusArea);
    
    navigate(`/express-registration?${params.toString()}`);
  };

  const handleTraditionalLogin = () => {
    navigate('/auth');
  };

  // Real-time updates simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setSocialProof(prev => ({
        ...prev,
        recentInvestments: prev.recentInvestments + Math.floor(Math.random() * 3)
      }));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (user) {
    const urlParams = new URLSearchParams(window.location.search);
    const isActivationCallback = urlParams.get('activated') === 'true';
    
    if (isActivationCallback) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-4">Account Activated!</h2>
              <p className="text-muted-foreground mb-6">Complete your profile to start investing</p>
              <Button 
                onClick={() => navigate('/profile?setup=true')} 
                className="w-full"
              >
                Complete Profile Setup
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-4">Welcome Back!</h2>
            <p className="text-muted-foreground mb-6">Continue your investment journey</p>
            <Button 
              onClick={() => navigate('/dashboard')} 
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header with UTM source indicator */}
      <div className="w-full bg-background/80 backdrop-blur-sm border-b border-border p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img 
              src="/lovable-uploads/20f4ac2e-05d8-4232-a9e9-fb42d42e4b18.png" 
              alt="Yawatu Logo"
              className="w-8 h-8"
            />
            <span className="font-bold text-lg">Yawatu</span>
          </div>
          {utmParams.utm_source && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {content.socialIcon}
              From {utmParams.utm_source}
            </Badge>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-medium">1</div>
              <span>Join</span>
              <div className="w-8 border-t border-border"></div>
              <div className="w-8 h-8 bg-muted text-muted-foreground rounded-full flex items-center justify-center font-medium">2</div>
              <span>Setup</span>
              <div className="w-8 border-t border-border"></div>
              <div className="w-8 h-8 bg-muted text-muted-foreground rounded-full flex items-center justify-center font-medium">3</div>
              <span>Invest</span>
            </div>
          </div>
          <Progress value={33} className="w-full max-w-md mx-auto" />
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left column - Main content */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                {content.headline}
              </h1>
              <p className="text-xl text-muted-foreground mb-6">
                {content.subheadline}
              </p>
            </div>

            {/* Social proof */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{socialProof.totalInvestors.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Investors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary">{socialProof.todayJoined}</div>
                <div className="text-sm text-muted-foreground">Joined Today</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent animate-pulse">{socialProof.recentInvestments}</div>
                <div className="text-sm text-muted-foreground">Recent Orders</div>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-3">
              {content.benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  </div>
                  <span className="text-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column - CTA Card */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-center">Join in 30 Seconds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Social Login Options */}
              <div className="space-y-3">
                {isFromFacebook() && (
                  <Button 
                    onClick={() => handleSocialLogin('facebook')}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Facebook className="w-4 h-4 mr-2" />
                    Continue with Facebook
                  </Button>
                )}
                
                <Button 
                  onClick={() => handleSocialLogin('google')}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button 
                onClick={handleExpressRegister}
                variant="secondary"
                className="w-full"
              >
                <Clock className="w-4 h-4 mr-2" />
                Quick Registration
              </Button>

              <Button 
                onClick={handleTraditionalLogin}
                variant="ghost"
                className="w-full text-sm"
              >
                I already have an account
              </Button>

              {/* Trust indicators */}
              <div className="text-center text-xs text-muted-foreground space-y-1 pt-4">
                <div className="flex justify-center items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    <span>Regulated</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>2,800+ Members</span>
                  </div>
                </div>
                <p>Start with just UGX 10,000 • No hidden fees</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SmartLandingPage;