import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileBottomPaddingProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileBottomPadding: React.FC<MobileBottomPaddingProps> = ({ 
  children, 
  className = '' 
}) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  // Add bottom padding on mobile when user is logged in (mobile nav is shown)
  const shouldAddPadding = user && isMobile;
  
  return (
    <div className={`${shouldAddPadding ? 'pb-16 md:pb-0' : ''} ${className}`}>
      {children}
    </div>
  );
};