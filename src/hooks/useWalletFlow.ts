import { useState, useCallback } from 'react';
import { useEnhancedWalletContext } from './useEnhancedWalletContext';
import { toast } from 'sonner';

interface TransactionData {
  type: 'deposit' | 'withdraw' | 'transfer' | 'exchange';
  amount: number;
  currency: string;
  recipient?: string;
  description?: string;
  metadata?: Record<string, any>;
}

interface WalletFlowState {
  currentStep: 'onboarding' | 'overview' | 'transaction' | 'confirmation';
  activeTransaction: TransactionData | null;
  showBiometricPrompt: boolean;
  requiresPinEntry: boolean;
}

export const useWalletFlow = () => {
  const { currentUserId, canPerformTransaction } = useEnhancedWalletContext();
  
  const [flowState, setFlowState] = useState<WalletFlowState>({
    currentStep: 'overview',
    activeTransaction: null,
    showBiometricPrompt: false,
    requiresPinEntry: false
  });

  const [userPreferences] = useState({
    biometricEnabled: false,
    pinEnabled: true,
    quickActionsEnabled: true,
    smartSuggestionsEnabled: true
  });

  const initiateTransaction = useCallback(async (transactionData: TransactionData) => {
    // Check permissions first
    if (!canPerformTransaction(transactionData.type, transactionData.amount)) {
      toast.error(`You don't have permission to perform this ${transactionData.type} transaction`);
      return false;
    }

    // Set up the transaction flow
    setFlowState(prev => ({
      ...prev,
      activeTransaction: transactionData,
      currentStep: 'confirmation',
      showBiometricPrompt: userPreferences.biometricEnabled,
      requiresPinEntry: userPreferences.pinEnabled
    }));

    return true;
  }, [canPerformTransaction, userPreferences]);

  const processTransaction = useCallback(async (pin?: string, biometricVerified?: boolean) => {
    if (!flowState.activeTransaction) return false;

    try {
      // Verify security requirements
      if (userPreferences.pinEnabled && !pin) {
        toast.error('PIN required for this transaction');
        return false;
      }

      if (userPreferences.biometricEnabled && !biometricVerified) {
        toast.error('Biometric verification required');
        return false;
      }

      const { type } = flowState.activeTransaction;

      // Clear transaction state
      setFlowState(prev => ({
        ...prev,
        activeTransaction: null,
        currentStep: 'overview',
        showBiometricPrompt: false,
        requiresPinEntry: false
      }));

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} transaction initiated successfully!`);
      return true;

    } catch (error) {
      console.error('Transaction processing error:', error);
      toast.error('Transaction failed. Please try again.');
      return false;
    }
  }, [flowState.activeTransaction, userPreferences]);

  const cancelTransaction = useCallback(() => {
    setFlowState(prev => ({
      ...prev,
      activeTransaction: null,
      currentStep: 'overview',
      showBiometricPrompt: false,
      requiresPinEntry: false
    }));
  }, []);

  return {
    flowState,
    userPreferences,
    initiateTransaction,
    processTransaction,
    cancelTransaction,
    isTransactionInProgress: !!flowState.activeTransaction
  };
};