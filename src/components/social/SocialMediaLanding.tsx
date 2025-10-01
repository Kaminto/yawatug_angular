import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Facebook, Users, Shield, Clock, Smartphone, Star, TrendingUp, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

const SocialMediaLanding: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [utmParams, setUtmParams] = useState<UTMParams>({});

  // Capture UTM parameters on component mount
  useEffect(() => {
    const params: UTMParams = {
      source: searchParams.get('utm_source') || undefined,
      medium: searchParams.get('utm_medium') || undefined,
      campaign: searchParams.get('utm_campaign') || undefined,
      content: searchParams.get('utm_content') || undefined,
      term: searchParams.get('utm_term') || undefined,
    };
    setUtmParams(params);

    // Store UTM data in localStorage for tracking
    if (Object.values(params).some(v => v)) {
      localStorage.setItem('utm_params', JSON.stringify(params));
    }
  }, [searchParams]);

  const handleFacebookLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;

      toast.success("Redirecting to Facebook...");
    } catch (error: any) {
      console.error('Facebook login error:', error);
      toast.error(error.message || 'Facebook login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExpressRegister = () => {
    // Include referral code from URL if present
    const referralCode = searchParams.get('ref');
    const registerUrl = referralCode 
      ? `/register-new?ref=${referralCode}&express=true` 
      : '/register-new?express=true';
    navigate(registerUrl);
  };

  const trustElements = [
    {
      icon: <Award className="h-5 w-5" />,
      title: "PLC Registered",
      description: "Legally registered Public Limited Company"
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: "Share Certificates",
      description: "Official certificates for all investments"
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: "Instant Payments",
      description: "24/7 payment processing system"
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      title: "Share Liquidity",
      description: "Buy and sell shares anytime"
    }
  ];

  const socialProof = [
    "2,500+ Active Investors",
    "UGX 850M+ Invested",
    "95% Customer Satisfaction",
    "4.8★ Rating"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Mobile-First Header */}
      <div className="bg-card border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-primary">YAWATU</div>
            <Badge variant="secondary" className="text-xs">
              {utmParams.source === 'facebook' ? 'From Facebook' : 'Welcome'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Hero Section - Mobile Optimized */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-4xl font-bold mb-4">
            Start Investing in 
            <span className="gold-text block sm:inline"> Uganda's Mining Future</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            Join thousands of investors earning returns from Uganda's booming mining sector. 
            Get started in just 2 minutes.
          </p>

          {/* Social Proof Bar */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {socialProof.map((proof, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {proof}
              </Badge>
            ))}
          </div>
        </div>

        {/* Main CTA Card */}
        <Card className="max-w-md mx-auto mb-8 elegant-card">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Facebook Login - Primary CTA */}
              <Button
                onClick={handleFacebookLogin}
                disabled={loading}
                size="lg"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                ) : (
                  <Facebook className="h-5 w-5 mr-2" />
                )}
                Continue with Facebook
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              {/* Express Registration */}
              <Button
                onClick={handleExpressRegister}
                variant="outline"
                size="lg"
                className="w-full h-12 border-primary text-primary hover:bg-primary/10"
              >
                <Smartphone className="h-5 w-5 mr-2" />
                Quick Registration (2 min)
              </Button>
            </div>

            <div className="text-center mt-4">
              <p className="text-xs text-muted-foreground">
                Already have an account?{' '}
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto text-primary hover:text-primary/80"
                  onClick={() => navigate('/auth')}
                >
                  Sign in here
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Trust Elements Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {trustElements.map((element, index) => (
            <Card key={index} className="p-4 text-center elegant-card">
              <div className="flex justify-center mb-2 text-primary">
                {element.icon}
              </div>
              <h3 className="font-semibold text-sm mb-1">{element.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {element.description}
              </p>
            </Card>
          ))}
        </div>

        {/* Real-time Activity Feed */}
        <Card className="mb-8 elegant-card">
          <CardContent className="p-4">
            <div className="flex items-center mb-3">
              <Users className="h-4 w-4 text-primary mr-2" />
              <span className="text-sm font-medium">Recent Investor Activity</span>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>James K. bought 50 shares</span>
                <span>2 minutes ago</span>
              </div>
              <div className="flex justify-between">
                <span>Sarah M. invested UGX 2,000,000</span>
                <span>5 minutes ago</span>
              </div>
              <div className="flex justify-between">
                <span>David O. earned UGX 150,000 returns</span>
                <span>8 minutes ago</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <Card className="elegant-card">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center">
              <Star className="h-4 w-4 text-primary mr-2" />
              Quick Questions
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium">Is this safe?</p>
                <p className="text-muted-foreground">Yes, we're a registered PLC with full regulatory compliance.</p>
              </div>
              <div>
                <p className="font-medium">How quickly can I start?</p>
                <p className="text-muted-foreground">Registration takes 2 minutes, verification within 24 hours.</p>
              </div>
              <div>
                <p className="font-medium">Can I withdraw anytime?</p>
                <p className="text-muted-foreground">Yes, shares are liquid and can be sold 24/7.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Support */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground mb-2">Need help? Chat with us instantly</p>
          <Button
            variant="outline"
            size="sm"
            className="border-green-500 text-green-600 hover:bg-green-50"
            onClick={() => window.open('https://wa.me/256700000000', '_blank')}
          >
            <Smartphone className="h-4 w-4 mr-2" />
            WhatsApp Support
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SocialMediaLanding;