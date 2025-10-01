import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyComponentWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  minHeight?: string;
}

const LazyComponentWrapper: React.FC<LazyComponentWrapperProps> = ({ 
  children, 
  fallback,
  minHeight = "200px" 
}) => {
  const defaultFallback = (
    <div className="space-y-4 p-4" style={{ minHeight }}>
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-32 w-full" />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};

export default LazyComponentWrapper;