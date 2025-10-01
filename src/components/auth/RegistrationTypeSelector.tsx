import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, FileText, Zap, Users } from 'lucide-react';

const RegistrationTypeSelector: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 px-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Choose Your Registration Path</h1>
          <p className="text-muted-foreground">Select the option that best fits your needs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Express Registration */}
          <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Quick Start</CardTitle>
              <p className="text-muted-foreground">Perfect for social media users</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm">Just 2 minutes to complete</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm">Start investing immediately</span>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm">Complete profile later</span>
                </div>
              </div>

              <div className="bg-primary/5 p-3 rounded-lg">
                <p className="text-sm font-medium text-primary">✨ Recommended for Facebook users</p>
                <p className="text-xs text-primary/80">Optimized for mobile and social media traffic</p>
              </div>

              <Button 
                onClick={() => navigate('/join/express')}
                className="w-full h-12"
                size="lg"
              >
                Start Quick Registration
              </Button>
            </CardContent>
          </Card>

          {/* Full Registration */}
          <Card className="border-2 border-muted/20 hover:border-muted/40 transition-colors">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-muted/10 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle className="text-xl">Complete Setup</CardTitle>
              <p className="text-muted-foreground">Full account configuration</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Complete all details upfront</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Account type selection</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">5-10 minutes to complete</span>
                </div>
              </div>

              <div className="bg-muted/5 p-3 rounded-lg">
                <p className="text-sm font-medium">📋 Best for business accounts</p>
                <p className="text-xs text-muted-foreground">Organizations and detailed setups</p>
              </div>

              <Button 
                onClick={() => navigate('/join/full')}
                variant="outline"
                className="w-full h-12"
                size="lg"
              >
                Full Registration
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Button 
              variant="link" 
              className="p-0 text-primary hover:text-primary/80" 
              onClick={() => navigate('/login')}
            >
              Sign in here
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationTypeSelector;