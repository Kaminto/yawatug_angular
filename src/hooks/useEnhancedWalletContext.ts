
import { useState, useEffect } from 'react';
import { useAdminUser } from '@/contexts/AdminUserContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WalletPermissions {
  canViewBalance: boolean;
  canDeposit: boolean;
  canWithdraw: boolean;
  canTransfer: boolean;
  canExchange: boolean;
  maxTransactionAmount: number;
  requiresApproval: boolean;
}

interface WalletAccessLevel {
  level: 'view-only' | 'limited-transactions' | 'full-access';
  permissions: WalletPermissions;
}

export const useEnhancedWalletContext = () => {
  const { currentUser, originalAdmin } = useAdminUser();
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [walletAccessLevel, setWalletAccessLevel] = useState<WalletAccessLevel | null>(null);
  const [sessionTimeout, setSessionTimeout] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const getWalletPermissions = (role: string, verificationStatus: string): WalletPermissions => {
    const basePermissions: WalletPermissions = {
      canViewBalance: true,
      canDeposit: true,
      canWithdraw: false,
      canTransfer: false,
      canExchange: false,
      maxTransactionAmount: 0,
      requiresApproval: true
    };

    // Adjust permissions based on user role and verification status
    if (role === 'admin') {
      return {
        canViewBalance: true,
        canDeposit: true,
        canWithdraw: true,
        canTransfer: true,
        canExchange: true,
        maxTransactionAmount: Infinity,
        requiresApproval: false
      };
    }

    if (verificationStatus === 'active') {
      return {
        ...basePermissions,
        canWithdraw: true,
        canTransfer: true,
        canExchange: true,
        maxTransactionAmount: 10000000, // 10M UGX
        requiresApproval: false
      };
    }

    if (verificationStatus === 'pending_verification') {
      return {
        ...basePermissions,
        maxTransactionAmount: 1000000, // 1M UGX
        requiresApproval: true
      };
    }

    return basePermissions;
  };

  const initializeWalletContext = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        let effectiveUserId = user.id;
        let isViewingAsUser = false;

        // Check if admin is viewing as another user
        if (currentUser?.id && currentUser.id !== user.id && originalAdmin) {
          isViewingAsUser = true;
          effectiveUserId = currentUser.id;
          setIsAdminMode(false);
        } else if (originalAdmin) {
          setIsAdminMode(true);
        } else {
          setIsAdminMode(false);
        }

        setCurrentUserId(effectiveUserId);

        // Get user profile and role
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_role, status, profile_completion_percentage')
          .eq('id', effectiveUserId)
          .single();
        
        if (profile) {
          setUserRole(profile.user_role || 'user');
          
          const permissions = getWalletPermissions(
            profile.user_role || 'user', 
            profile.status || 'unverified'
          );
          
          const accessLevel: WalletAccessLevel = {
            level: profile.user_role === 'admin' ? 'full-access' : 
                   profile.status === 'active' ? 'full-access' : 
                   profile.status === 'pending_verification' ? 'limited-transactions' : 'view-only',
            permissions
          };
          
          setWalletAccessLevel(accessLevel);

          // Log admin access for audit trail
          if (isViewingAsUser && originalAdmin) {
            await supabase
              .from('admin_user_sessions')
              .insert({
                admin_id: user.id,
                user_id: effectiveUserId,
                started_at: new Date().toISOString()
              });
          }
        }
      }
    } catch (error) {
      console.error('Error initializing wallet context:', error);
      toast.error('Failed to initialize wallet context');
    } finally {
      setLoading(false);
    }
  };

  const startSessionTimeout = () => {
    const timeout = setTimeout(() => {
      toast.warning('Wallet session expired for security. Please refresh to continue.');
      // Could redirect to login or refresh page
    }, 30 * 60 * 1000); // 30 minutes

    setSessionTimeout(timeout as any);
  };

  const clearSessionTimeout = () => {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
      setSessionTimeout(null);
    }
  };

  useEffect(() => {
    initializeWalletContext();
    startSessionTimeout();

    return () => {
      clearSessionTimeout();
    };
  }, [currentUser, originalAdmin]);

  const canPerformTransaction = (transactionType: string, amount?: number): boolean => {
    if (!walletAccessLevel) return false;
    
    const { permissions } = walletAccessLevel;
    
    switch (transactionType) {
      case 'deposit':
        return permissions.canDeposit;
      case 'withdraw':
        return permissions.canWithdraw && (!amount || amount <= permissions.maxTransactionAmount);
      case 'transfer':
        return permissions.canTransfer && (!amount || amount <= permissions.maxTransactionAmount);
      case 'exchange':
        return permissions.canExchange;
      default:
        return false;
    }
  };

  return {
    isAdminMode,
    currentUserId,
    userRole,
    walletAccessLevel,
    loading,
    isAdmin: userRole === 'admin',
    effectiveUserId: currentUserId,
    canPerformTransaction,
    refreshContext: initializeWalletContext
  };
};
