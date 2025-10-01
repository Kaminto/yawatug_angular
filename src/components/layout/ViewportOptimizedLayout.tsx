import React from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface ViewportOptimizedLayoutProps {
  children: React.ReactNode;
  className?: string;
  withMobileNavPadding?: boolean;
}

export const ViewportOptimizedLayout: React.FC<ViewportOptimizedLayoutProps> = ({
  children,
  className = '',
  withMobileNavPadding = true
}) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  const shouldAddMobilePadding = withMobileNavPadding && user && isMobile;

  return (
    <div className={cn(
      "flex flex-col min-h-[100vh] overflow-x-hidden",
      shouldAddMobilePadding && "pb-16",
      className
    )}>
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </div>
    </div>
  );
};