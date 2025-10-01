import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';

const RequestActivation = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      // First, check if the user exists and needs activation
      const { data: userCheck, error: checkError } = await supabase.rpc('check_user_status_public', {
        p_email: email.toLowerCase()
      });

      if (checkError) {
        console.error('Error checking user status:', checkError);
        toast.error('Unable to check account status. Please try again.');
        return;
      }

      if (!(userCheck as any)?.exists) {
        toast.error('No account found with this email address. Please check your email or contact support.');
        return;
      }

      if (!(userCheck as any)?.needs_activation) {
        toast.error('This account has already been activated. Please use the login form instead.');
        return;
      }

      // Generate proper invitation token for existing user
      const { data: tokenResult, error: tokenError } = await supabase
        .rpc('generate_invitation_token', {
          p_user_id: (userCheck as any).profile.id
        });

      if (tokenError) {
        console.error('Token generation error:', tokenError);
        toast.error('Failed to generate activation token. Please try again.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('unified-communication-sender', {
        body: {
          recipient: email.toLowerCase(),
          subject: 'Account Activation - YAWATU',
          message: 'Welcome to YAWATU! Please activate your account to get started with your investment journey.',
          channel: 'email',
          templateType: 'account_activation',
          templateData: {
            email: email.toLowerCase(),
            activationUrl: `${window.location.origin}/activate-account?token=${encodeURIComponent(tokenResult)}`,
            name: (userCheck as any).profile?.full_name || 'User'
          }
        }
      });

      if (error) {
        console.error('Activation email error:', error);
        toast.error('Failed to send activation email. Please try again.');
        return;
      }

      // Check the response structure from unified-communication-sender
      if (data?.success === true || data?.results?.email?.success === true) {
        toast.success('Activation email sent! Please check your inbox.');
        setSubmitted(true);
      } else {
        const errorMsg = data?.error || data?.results?.email?.error || 'Failed to send activation email';
        console.error('Activation email failed:', data);
        toast.error(errorMsg);
      }
    } catch (error: any) {
      console.error('Activation request error:', error);
      toast.error(error.message || 'Failed to send activation email');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-green-600">
                Activation Email Sent!
              </CardTitle>
              <p className="text-gray-600">
                We've sent an activation link to {email}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Next Steps:</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                    <li>Check your email inbox (including spam folder)</li>
                    <li>Click the activation link in the email</li>
                    <li>Set up your secure password</li>
                    <li>Log in to access your investment portfolio</li>
                  </ol>
                </div>

                <div className="text-center space-y-3">
                  <Button 
                    onClick={() => {
                      setSubmitted(false);
                      setEmail('');
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Send Another Request
                  </Button>
                  <Button 
                    onClick={() => navigate('/login')}
                    className="w-full bg-yawatu-gold text-black hover:bg-yawatu-gold-dark"
                  >
                    Back to Login
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-yawatu-gold rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-black" />
            </div>
            <CardTitle className="text-2xl font-bold text-yawatu-gold">
              Request Account Activation
            </CardTitle>
            <p className="text-gray-600">
              Enter your email to receive an activation link for your imported account.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  This should be the email associated with your YAWATU investment club membership.
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-yawatu-gold text-black hover:bg-yawatu-gold-dark" 
                disabled={loading}
              >
                {loading ? 'Sending Activation Email...' : 'Send Activation Email'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/login')}
                className="text-yawatu-gold hover:text-yawatu-gold-dark"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
              <p className="text-sm text-gray-600 mb-2">
                If you're having trouble with account activation:
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Make sure you're using the email from your club membership</li>
                <li>• Check your spam/junk folder for the activation email</li>
                <li>• Contact support if you still can't access your account</li>
              </ul>
              <Button 
                variant="link" 
                className="p-0 h-auto text-yawatu-gold mt-2"
                onClick={() => navigate('/contact')}
              >
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RequestActivation;