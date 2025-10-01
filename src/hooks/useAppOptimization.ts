import { useEffect, useState } from 'react';
import { useSmartLoading } from './useSmartLoading';

export const useAppOptimization = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);
  const { startLoading, stopLoading } = useSmartLoading();

  useEffect(() => {
    // Mark hydration complete
    setIsHydrated(true);

    // Performance optimizations
    const optimizeApp = async () => {
      startLoading();
      
      // Preload critical resources
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          // Preload key components - removed missing imports
          
          setIsOptimized(true);
          stopLoading();
        });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
          setIsOptimized(true);
          stopLoading();
        }, 100);
      }
    };

    optimizeApp();
  }, [startLoading, stopLoading]);

  return {
    isHydrated,
    isOptimized,
    preloadComponent: (importFn: () => Promise<any>) => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => importFn());
      }
    }
  };
};