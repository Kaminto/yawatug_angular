import React from 'react';
import { UnifiedRegistrationFlow } from '@/components/auth/UnifiedRegistrationFlow';
import { Link } from 'react-router-dom';
import { ViewportOptimizedLayout } from '@/components/layout/ViewportOptimizedLayout';
import { AuthLogo } from '@/components/auth/AuthLogo';

const UnifiedRegister: React.FC = () => {
  return (
    <ViewportOptimizedLayout withMobileNavPadding={false}>
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10">
        {/* Header */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10">
          <AuthLogo size="sm" showText={true} />
          <Link 
            to="/login" 
            className="text-xs md:text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Already have an account? Sign in
          </Link>
        </div>

        {/* Main Content */}
        <div className="flex min-h-screen items-center justify-center p-3 pt-16">
          <UnifiedRegistrationFlow />
        </div>
      </div>
    </ViewportOptimizedLayout>
  );
};
export default UnifiedRegister;