import React from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface OptimizedMobilePageProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  showMobileHeader?: boolean;
  fullHeight?: boolean;
}

export const OptimizedMobilePage: React.FC<OptimizedMobilePageProps> = ({
  children,
  className = '',
  title,
  showMobileHeader = false,
  fullHeight = true
}) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  const hasBottomNav = user && isMobile;

  return (
    <div className={cn(
      "flex flex-col w-full",
      fullHeight && "min-h-screen",
      className
    )}>
      {/* Optional Mobile Header */}
      {showMobileHeader && title && (
        <header className="sticky top-0 z-40 flex h-14 items-center justify-center border-b bg-background/95 backdrop-blur px-4 md:hidden">
          <h1 className="text-lg font-semibold truncate">{title}</h1>
        </header>
      )}
      
      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-auto",
        hasBottomNav && "pb-16",
        showMobileHeader && fullHeight && "min-h-[calc(100vh-3.5rem)]",
        !showMobileHeader && fullHeight && "min-h-[100vh]"
      )}>
        {children}
      </main>
    </div>
  );
};