import React, { Suspense, lazy } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyLoadWrapperProps {
  componentPath: string;
  fallback?: React.ReactNode;
  minHeight?: string;
}

// Dynamic import cache to prevent re-importing
const componentCache = new Map<string, React.LazyExoticComponent<any>>();

export const LazyLoadWrapper: React.FC<LazyLoadWrapperProps> = ({
  componentPath,
  fallback,
  minHeight = "200px"
}) => {
  // Get or create lazy component
  const getLazyComponent = (path: string) => {
    if (!componentCache.has(path)) {
      const LazyComponent = lazy(() => import(path));
      componentCache.set(path, LazyComponent);
    }
    return componentCache.get(path)!;
  };

  const LazyComponent = getLazyComponent(componentPath);

  const defaultFallback = (
    <div className="space-y-4 p-4 animate-pulse" style={{ minHeight }}>
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-32 w-full" />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      <LazyComponent />
    </Suspense>
  );
};

// Preload utility for critical components
export const preloadComponent = (componentPath: string) => {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      import(componentPath).catch(console.error);
    });
  } else {
    setTimeout(() => {
      import(componentPath).catch(console.error);
    }, 100);
  }
};

export default LazyLoadWrapper;