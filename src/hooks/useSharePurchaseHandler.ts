
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTransactionFees } from './useTransactionFees';
import { useFundAllocation } from './useFundAllocation';
import { useReferralTracking } from './useReferralTracking';

export const useSharePurchaseHandler = () => {
  const [loading, setLoading] = useState(false);
  const { getFeeDetails } = useTransactionFees();
  const { processTransactionFees } = useFundAllocation();
  const { trackReferralCommission } = useReferralTracking();

  const processSharePurchase = async (
    userId: string,
    shareId: string,
    quantity: number,
    pricePerShare: number,
    currency: string = 'UGX',
    walletId?: string
  ) => {
    setLoading(true);
    try {
      const totalAmount = quantity * pricePerShare;
      const feeDetails = getFeeDetails('share_purchase', totalAmount, currency);
      const totalWithFees = totalAmount + feeDetails.totalFee;

      // Validate share purchase using database function
      const { data: validationResult, error: validationError } = await supabase
        .rpc('validate_share_purchase', {
          p_share_id: shareId,
          p_quantity: quantity
        });

      if (validationError) throw validationError;
      
      const validation = validationResult as { valid: boolean; available_shares: number; error?: string };
      if (!validation.valid) {
        throw new Error(validation.error || 'Share purchase validation failed');
      }

      // Check wallet balance
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', walletId)
        .eq('user_id', userId)
        .single();

      if (walletError || !wallet) {
        throw new Error('Wallet not found');
      }

      if (wallet.balance < totalWithFees) {
        throw new Error('Insufficient wallet balance');
      }

      // Start transaction
      const { data: purchaseOrder, error: orderError } = await supabase
        .from('share_purchase_orders')
        .insert({
          user_id: userId,
          share_id: shareId,
          quantity,
          price_per_share: pricePerShare,
          total_amount: totalAmount,
          currency,
          payment_source: 'wallet',
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // CRITICAL: Record wallet transaction using database function
      // This automatically updates wallet balance via trigger
      const { data: transactionId, error: transactionError } = await supabase.rpc(
        'record_share_purchase_transaction',
        {
          p_user_id: userId,
          p_wallet_id: walletId,
          p_share_id: shareId,
          p_quantity: quantity,
          p_price_per_share: pricePerShare,
          p_total_amount: totalAmount,
          p_currency: currency,
          p_order_id: purchaseOrder.id
        }
      );

      if (transactionError) throw transactionError;

      // Create share transaction record (for share movement tracking)
      const { error: shareTransactionError } = await supabase
        .from('share_transactions')
        .insert({
          user_id: userId,
          share_id: shareId,
          transaction_type: 'purchase',
          quantity,
          price_per_share: pricePerShare,
          total_amount: totalAmount,
          currency,
          status: 'completed'
        });

      if (shareTransactionError) throw shareTransactionError;

      // CRITICAL: Update user_shares table to reflect new holdings
      // The trigger will automatically update available_shares
      const { data: existingHolding, error: checkError } = await supabase
        .from('user_shares')
        .select('id, quantity')
        .eq('user_id', userId)
        .eq('share_id', shareId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingHolding) {
        // Update existing holding
        const { error: updateHoldingError } = await supabase
          .from('user_shares')
          .update({ 
            quantity: existingHolding.quantity + quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingHolding.id);

        if (updateHoldingError) throw updateHoldingError;
      } else {
        // Create new holding
        const { error: createHoldingError } = await supabase
          .from('user_shares')
          .insert({
            user_id: userId,
            share_id: shareId,
            quantity,
            purchase_price_per_share: pricePerShare,
            currency,
            status: 'available_for_trade'
          });

        if (createHoldingError) throw createHoldingError;
      }

      // CRITICAL: Allocate share purchase proceeds to admin wallets
      // This distributes funds across project funding, admin fund, and buyback fund
      const { error: allocationError } = await supabase.rpc('allocate_share_purchase_proceeds_enhanced', {
        p_amount: totalAmount,
        p_currency: currency,
        p_transaction_id: purchaseOrder.id,
        p_user_id: userId
      });

      if (allocationError) {
        console.error('Error allocating share purchase proceeds:', allocationError);
        // Continue execution but log the error - we can fix allocations later
      }

      // Process transaction fees (separate from share purchase allocation)
      await processTransactionFees(feeDetails.totalFee, currency, 'share_purchase');

      // Track referral commission if user was referred
      const referralResult = await trackReferralCommission(
        userId,
        totalAmount,
        currency,
        'share_purchase'
      );

      if (referralResult.success && referralResult.commissionAmount) {
        console.log(`Referral commission tracked: UGX ${referralResult.commissionAmount.toLocaleString()}`);
      }

      // Update purchase order status
      const { error: updateOrderError } = await supabase
        .from('share_purchase_orders')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', purchaseOrder.id);

      if (updateOrderError) throw updateOrderError;

      toast.success('Share purchase completed successfully');
      return { success: true, orderId: purchaseOrder.id };

    } catch (error: any) {
      console.error('Error processing share purchase:', error);
      toast.error(error.message || 'Failed to process share purchase');
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    processSharePurchase
  };
};
