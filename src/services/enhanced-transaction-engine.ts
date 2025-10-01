// Enhanced Transaction Processing Engine
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TransactionRequest {
  id?: string;
  user_id: string;
  wallet_id: string;
  transaction_type: 'deposit' | 'withdraw' | 'transfer' | 'exchange';
  amount: number;
  currency: string;
  recipient_id?: string;
  recipient_wallet_id?: string;
  description?: string;
  payment_method?: string;
  payment_reference?: string;
  metadata?: Record<string, any>;
}

export interface TransactionResult {
  success: boolean;
  transaction_id?: string;
  error?: string;
  balance_updated?: boolean;
  fee_charged?: number;
}

export interface SecurityCheck {
  fraud_score: number;
  risk_level: 'low' | 'medium' | 'high';
  requires_2fa: boolean;
  requires_approval: boolean;
  blocked: boolean;
  reason?: string;
}

export class EnhancedTransactionEngine {
  private static instance: EnhancedTransactionEngine;
  
  static getInstance(): EnhancedTransactionEngine {
    if (!this.instance) {
      this.instance = new EnhancedTransactionEngine();
    }
    return this.instance;
  }

  async processTransaction(request: TransactionRequest): Promise<TransactionResult> {
    try {
      // 1. Security and validation checks
      const securityCheck = await this.performSecurityChecks(request);
      if (securityCheck.blocked) {
        return {
          success: false,
          error: securityCheck.reason || 'Transaction blocked by security system'
        };
      }

      // 2. Process based on transaction type
      switch (request.transaction_type) {
        case 'deposit':
          return await this.processDeposit(request, securityCheck);
        case 'withdraw':
          return await this.processWithdrawal(request, securityCheck);
        case 'transfer':
          return await this.processTransfer(request, securityCheck);
        case 'exchange':
          return await this.processExchange(request, securityCheck);
        default:
          return {
            success: false,
            error: 'Invalid transaction type'
          };
      }
    } catch (error: any) {
      console.error('Transaction processing error:', error);
      return {
        success: false,
        error: error.message || 'Transaction processing failed'
      };
    }
  }

  private async performSecurityChecks(request: TransactionRequest): Promise<SecurityCheck> {
    try {
      // Check transaction limits
      const limitsCheck = await this.checkTransactionLimits(request);
      if (!limitsCheck.valid) {
        return {
          fraud_score: 0,
          risk_level: 'high',
          requires_2fa: false,
          requires_approval: false,
          blocked: true,
          reason: limitsCheck.reason
        };
      }

      // Fraud detection
      const fraudScore = await this.calculateFraudScore(request);
      
      // Risk assessment
      const riskLevel = this.assessRiskLevel(fraudScore, request);
      
      // Determine security requirements
      const requires2FA = fraudScore > 30 || request.amount > 500000; // 500k UGX threshold
      const requiresApproval = fraudScore > 70 || request.amount > 2000000; // 2M UGX threshold

      return {
        fraud_score: fraudScore,
        risk_level: riskLevel,
        requires_2fa: requires2FA,
        requires_approval: requiresApproval,
        blocked: fraudScore > 90
      };
    } catch (error) {
      console.error('Security check error:', error);
      return {
        fraud_score: 50,
        risk_level: 'medium',
        requires_2fa: true,
        requires_approval: true,
        blocked: false
      };
    }
  }

  private async checkTransactionLimits(request: TransactionRequest): Promise<{valid: boolean, reason?: string}> {
    try {
      // Get user's transaction limits
      const { data: limits, error: limitsError } = await supabase
        .from('user_wallet_limits')
        .select('*')
        .eq('user_id', request.user_id)
        .single();

      if (limitsError && limitsError.code !== 'PGRST116') {
        throw limitsError;
      }

      // Default limits if none set
      const dailyLimit = limits?.daily_deposit_limit || limits?.daily_withdraw_limit || 1000000; // 1M UGX
      const monthlyLimit = limits?.monthly_deposit_limit || limits?.monthly_withdraw_limit || 10000000; // 10M UGX
      const singleLimit = 500000; // 500K UGX default single transaction limit

      // Check single transaction limit
      if (request.amount > singleLimit) {
        return {
          valid: false,
          reason: `Transaction amount exceeds single transaction limit of ${singleLimit.toLocaleString()}`
        };
      }

      // Check daily limit
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayTransactions, error: todayError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', request.user_id)
        .eq('transaction_type', request.transaction_type)
        .gte('created_at', today.toISOString())
        .eq('status', 'completed');

      if (todayError) throw todayError;

      const todayTotal = (todayTransactions || []).reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      if (todayTotal + request.amount > dailyLimit) {
        return {
          valid: false,
          reason: `Daily transaction limit of ${dailyLimit.toLocaleString()} would be exceeded`
        };
      }

      // Check monthly limit
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const { data: monthTransactions, error: monthError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', request.user_id)
        .eq('transaction_type', request.transaction_type)
        .gte('created_at', monthStart.toISOString())
        .eq('status', 'completed');

      if (monthError) throw monthError;

      const monthTotal = (monthTransactions || []).reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      if (monthTotal + request.amount > monthlyLimit) {
        return {
          valid: false,
          reason: `Monthly transaction limit of ${monthlyLimit.toLocaleString()} would be exceeded`
        };
      }

      return { valid: true };
    } catch (error) {
      console.error('Error checking transaction limits:', error);
      return { valid: false, reason: 'Unable to verify transaction limits' };
    }
  }

  private async calculateFraudScore(request: TransactionRequest): Promise<number> {
    let score = 0;

    try {
      // Check transaction patterns
      const { data: recentTransactions } = await supabase
        .from('transactions')
        .select('amount, transaction_type, created_at')
        .eq('user_id', request.user_id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false })
        .limit(10);

      // High frequency penalty
      if ((recentTransactions?.length || 0) > 5) {
        score += 20;
      }

      // Large amount penalty
      if (request.amount > 1000000) { // 1M UGX
        score += 15;
      }

      // Round amount penalty (often associated with fraud)
      if (request.amount % 100000 === 0 && request.amount > 100000) {
        score += 10;
      }

      // Night time transaction penalty (if between 10 PM and 6 AM)
      const hour = new Date().getHours();
      if (hour >= 22 || hour <= 6) {
        score += 5;
      }

      // Return calculated score
      return Math.min(score, 100);
    } catch (error) {
      console.error('Error calculating fraud score:', error);
      return 30; // Default medium risk
    }
  }

  private assessRiskLevel(fraudScore: number, request: TransactionRequest): 'low' | 'medium' | 'high' {
    if (fraudScore < 20) return 'low';
    if (fraudScore < 60) return 'medium';
    return 'high';
  }

  private async processDeposit(request: TransactionRequest, security: SecurityCheck): Promise<TransactionResult> {
    // For deposits, we typically wait for payment gateway confirmation
    // This is a simplified version - in production, this would integrate with payment gateways
    
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: request.user_id,
        wallet_id: request.wallet_id,
        transaction_type: 'deposit',
        amount: Math.abs(request.amount),
        currency: request.currency,
        status: security.requires_approval ? 'pending_approval' : 'pending',
        approval_status: security.requires_approval ? 'pending' : null,
        description: request.description || 'Wallet deposit',
        payment_method: request.payment_method,
        payment_reference: request.payment_reference,
        metadata: {
          ...request.metadata,
          fraud_score: security.fraud_score,
          risk_level: security.risk_level
        }
      })
      .select()
      .single();

    if (error) throw error;

    // If doesn't require approval, update wallet immediately (for demo purposes)
    if (!security.requires_approval) {
      await this.updateWalletBalance(request.wallet_id, request.amount);
      
      // Update transaction status
      await supabase
        .from('transactions')
        .update({ status: 'completed' })
        .eq('id', data.id);
    }

    return {
      success: true,
      transaction_id: data.id,
      balance_updated: !security.requires_approval
    };
  }

  private async processWithdrawal(request: TransactionRequest, security: SecurityCheck): Promise<TransactionResult> {
    // Check wallet balance first
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('id', request.wallet_id)
      .single();

    if (walletError) throw walletError;

    const fee = this.calculateWithdrawalFee(request.amount);
    const totalAmount = request.amount + fee;

    if (wallet.balance < totalAmount) {
      return {
        success: false,
        error: `Insufficient balance. Required: ${totalAmount.toLocaleString()}, Available: ${wallet.balance.toLocaleString()}`
      };
    }

    // Create transaction record
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: request.user_id,
        wallet_id: request.wallet_id,
        transaction_type: 'withdraw',
        amount: -Math.abs(request.amount), // Negative for withdrawals
        currency: request.currency,
        fee_amount: fee,
        status: security.requires_approval ? 'pending_approval' : 'pending',
        approval_status: security.requires_approval ? 'pending' : null,
        description: request.description || 'Wallet withdrawal',
        payment_method: request.payment_method,
        payment_reference: request.payment_reference,
        metadata: {
          ...request.metadata,
          fraud_score: security.fraud_score,
          risk_level: security.risk_level
        }
      })
      .select()
      .single();

    if (error) throw error;

    // Deduct amount immediately (held until approval/processing)
    await this.updateWalletBalance(request.wallet_id, -totalAmount);

    return {
      success: true,
      transaction_id: data.id,
      balance_updated: true,
      fee_charged: fee
    };
  }

  private async processTransfer(request: TransactionRequest, security: SecurityCheck): Promise<TransactionResult> {
    if (!request.recipient_wallet_id) {
      return {
        success: false,
        error: 'Recipient wallet ID is required for transfers'
      };
    }

    // Check sender balance
    const { data: senderWallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('id', request.wallet_id)
      .single();

    const fee = this.calculateTransferFee(request.amount);
    const totalAmount = request.amount + fee;

    if (!senderWallet || senderWallet.balance < totalAmount) {
      return {
        success: false,
        error: 'Insufficient balance for transfer including fees'
      };
    }

    // Create transfer transactions manually since the RPC doesn't exist yet
    const { data: transferData, error: transferError } = await supabase
      .from('transactions')
      .insert([
        {
          user_id: request.user_id,
          wallet_id: request.wallet_id,
          transaction_type: 'transfer_out',
          amount: -(request.amount + fee),
          currency: request.currency,
          status: security.requires_approval ? 'pending_approval' : 'completed',
          approval_status: security.requires_approval ? 'pending' : 'approved',
          description: request.description || 'Wallet transfer (outgoing)',
          fee_amount: fee,
          metadata: { recipient_wallet_id: request.recipient_wallet_id }
        }
      ])
      .select()
      .single();

    if (transferError) throw transferError;

    // Update balances if not requiring approval
    if (!security.requires_approval) {
      await this.updateWalletBalance(request.wallet_id, -(request.amount + fee));
      await this.updateWalletBalance(request.recipient_wallet_id, request.amount);
    }

    return {
      success: true,
      transaction_id: transferData.id,
      balance_updated: !security.requires_approval,
      fee_charged: fee
    };
  }

  private async processExchange(request: TransactionRequest, security: SecurityCheck): Promise<TransactionResult> {
    // Exchange currency implementation would go here
    // This would integrate with exchange rate providers
    
    return {
      success: false,
      error: 'Currency exchange functionality not yet implemented'
    };
  }

  private async updateWalletBalance(walletId: string, amount: number): Promise<void> {
    // Get current balance first
    const { data: wallet, error: getError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('id', walletId)
      .single();

    if (getError) throw getError;

    // Update with new balance
    const newBalance = wallet.balance + amount;
    const { error } = await supabase
      .from('wallets')
      .update({ 
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', walletId);

    if (error) throw error;
  }

  private calculateWithdrawalFee(amount: number): number {
    // Withdrawal fee: 1% or minimum 1000 UGX
    return Math.max(amount * 0.01, 1000);
  }

  private calculateTransferFee(amount: number): number {
    // Transfer fee: 0.5% or minimum 500 UGX
    return Math.max(amount * 0.005, 500);
  }
}

// Export singleton instance
export const transactionEngine = EnhancedTransactionEngine.getInstance();