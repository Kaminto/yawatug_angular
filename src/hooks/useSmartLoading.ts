import { useState, useEffect, useCallback } from 'react';
import { useProgressiveLoading } from './useProgressiveLoading';

interface SmartLoadingConfig {
  enableProgressiveLoading?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  showSkeletonDuration?: number;
}

export const useSmartLoading = (config: SmartLoadingConfig = {}) => {
  const {
    enableProgressiveLoading = true,
    retryAttempts = 3,
    retryDelay = 1000,
    showSkeletonDuration = 300
  } = config;

  const [showSkeleton, setShowSkeleton] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);
  const progressiveLoading = useProgressiveLoading();

  const startLoading = useCallback(() => {
    setGlobalLoading(true);
    setShowSkeleton(true);
    
    // Show skeleton for minimum duration for better UX
    setTimeout(() => {
      setShowSkeleton(false);
    }, showSkeletonDuration);
  }, [showSkeletonDuration]);

  const stopLoading = useCallback(() => {
    setGlobalLoading(false);
    setShowSkeleton(false);
  }, []);

  const withRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    attempts: number = retryAttempts
  ): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      if (attempts > 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return withRetry(operation, attempts - 1);
      }
      throw error;
    }
  }, [retryAttempts, retryDelay]);

  return {
    showSkeleton,
    globalLoading,
    startLoading,
    stopLoading,
    withRetry,
    progressive: enableProgressiveLoading ? progressiveLoading : null
  };
};