import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Facebook, Twitter, Linkedin, Mail } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SocialLoginProps {
  onSuccess?: () => void;
  className?: string;
}

const SocialLogin: React.FC<SocialLoginProps> = ({ onSuccess, className = "" }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const socialProviders = [
    {
      name: 'Facebook',
      icon: Facebook,
      provider: 'facebook',
      color: 'bg-blue-600 hover:bg-blue-700 text-white',
      description: 'Continue with Facebook',
      priority: 1
    },
    {
      name: 'Google',
      icon: Mail,
      provider: 'google',
      color: 'bg-red-600 hover:bg-red-700 text-white',
      description: 'Continue with Google',
      priority: 2
    },
    {
      name: 'Twitter',
      icon: Twitter,
      provider: 'twitter',
      color: 'bg-sky-500 hover:bg-sky-600 text-white',
      description: 'Continue with Twitter',
      priority: 3
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      provider: 'linkedin_oidc',
      color: 'bg-blue-700 hover:bg-blue-800 text-white',
      description: 'Continue with LinkedIn',
      priority: 4
    }
  ];

  const handleSocialLogin = async (provider: string) => {
    try {
      setLoading(provider);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo: `${window.location.origin}/smart-landing?social=true&provider=${provider}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Redirecting...",
        description: `Signing in with ${provider}`,
      });

    } catch (error: any) {
      console.error('Social login error:', error);
      toast({
        title: "Login Failed",
        description: error.message || `Failed to sign in with ${provider}`,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const connectSocialAccount = async (provider: string) => {
    try {
      setLoading(provider);
      
      // For already logged-in users to connect additional social accounts
      const { data, error } = await supabase.auth.linkIdentity({
        provider: provider as any,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Account Connected",
        description: `Successfully connected your ${provider} account`,
      });

      onSuccess?.();

    } catch (error: any) {
      console.error('Social connection error:', error);
      toast({
        title: "Connection Failed",
        description: error.message || `Failed to connect ${provider} account`,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleSocialAction = async (provider: string) => {
    // Always use sign-in flow for social login during registration
    await handleSocialLogin(provider);
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-center">Social Login</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {socialProviders
          .sort((a, b) => a.priority - b.priority)
          .map((provider) => (
          <Button
            key={provider.name}
            onClick={() => handleSocialAction(provider.provider)}
            disabled={loading === provider.provider}
            className={`w-full ${provider.color} border-0 ${
              provider.priority === 1 ? 'h-12 text-base font-semibold' : 'h-10'
            }`}
            variant="default"
          >
            {loading === provider.provider ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <provider.icon className="h-4 w-4 mr-2" />
            )}
            {loading === provider.provider ? 'Connecting...' : provider.description}
          </Button>
        ))}
        
        <div className="text-center text-sm text-muted-foreground pt-2">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </div>
      </CardContent>
    </Card>
  );
};

export default SocialLogin;