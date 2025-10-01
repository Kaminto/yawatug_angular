import React, { lazy } from 'react';

// User components - Lazy loaded for performance
export const LazyUserWallet = lazy(() => import('@/pages/UserWallet'));
export const LazyEnhancedUserShares = lazy(() => import('@/pages/EnhancedUserShares'));
export const LazyProjects = lazy(() => import('@/pages/Projects'));
export const LazyReferrals = lazy(() => import('@/pages/Referrals'));
export const LazyVoting = lazy(() => import('@/pages/Voting'));
export const LazySupport = lazy(() => import('@/pages/Support'));
export const LazyInvestmentClub = lazy(() => import('@/pages/InvestmentClub'));

// Admin components - Heavy components that should be code split
export const LazyAdminUsers = lazy(() => import('@/pages/AdminUsers'));
export const LazyAdminWallet = lazy(() => import('@/pages/AdminWallet'));
export const LazyAdminShares = lazy(() => import('@/pages/AdminShares'));
export const LazyAdminProjects = lazy(() => import('@/pages/AdminProjects'));
export const LazyAdminAnalytics = lazy(() => import('@/pages/AdminAnalytics'));
export const LazyAdminSystemHealth = lazy(() => import('@/pages/AdminSystemHealth'));
export const LazyAdminSettings = lazy(() => import('@/pages/AdminSettings'));
export const LazyAdminMedia = lazy(() => import('@/pages/AdminMedia'));
export const LazyAdminChatbot = lazy(() => import('@/pages/AdminChatbot'));

// Analytics and reporting components
export const LazyTransactionReports = lazy(() => import('@/components/admin/wallet/TransactionReports'));
export const LazyUnifiedFinancialDashboard = lazy(() => import('@/components/admin/wallet/UnifiedFinancialDashboard'));

// Preload critical user components
export const preloadUserComponents = () => {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      // Preload most commonly accessed user components
      import('@/pages/UserWallet');
      import('@/pages/EnhancedUserShares');
      import('@/pages/EnhancedDashboard');
    });
  }
};

// Preload admin components for admin users
export const preloadAdminComponents = () => {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      // Preload core admin components
      import('@/pages/AdminUsers');
      import('@/pages/AdminWallet');
      import('@/pages/AdminAnalytics');
    });
  }
};

export default {
  // User Components
  LazyUserWallet,
  LazyEnhancedUserShares,
  LazyProjects,
  LazyReferrals,
  LazyVoting,
  LazySupport,
  LazyInvestmentClub,
  
  // Admin Components
  LazyAdminUsers,
  LazyAdminWallet,
  LazyAdminShares,
  LazyAdminProjects,
  LazyAdminAnalytics,
  LazyAdminSystemHealth,
  LazyAdminSettings,
  LazyAdminMedia,
  LazyAdminChatbot,
  
  // Utilities
  preloadUserComponents,
  preloadAdminComponents
};