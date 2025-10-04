import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useReferralTracking = () => {
  
  const trackReferralCommission = async (
    referredUserId: string,
    transactionAmount: number,
    currency: string = 'UGX',
    transactionType: string = 'share_purchase'
  ) => {
    try {
      // Get the referred user's profile to find their referrer
      const { data: referredProfile, error: profileError } = await supabase
        .from('profiles')
        .select('referred_by')
        .eq('id', referredUserId)
        .single();

      if (profileError || !referredProfile?.referred_by) {
        // No referrer, nothing to track
        return { success: true, message: 'No referrer to track' };
      }

      const referrerId = referredProfile.referred_by;

      // Prevent self-referral: Users cannot earn commissions from their own transactions
      if (referrerId === referredUserId) {
        return { 
          success: false, 
          message: 'Self-referral commissions are not allowed' 
        };
      }

      // Get configurable commission rate and check if enabled
      const { data: enabledData } = await supabase
        .from('referral_settings')
        .select('setting_value')
        .eq('setting_name', 'commission_enabled')
        .eq('is_active', true)
        .single();

      // If commissions are disabled, exit early
      if (!enabledData || enabledData.setting_value <= 0) {
        return { success: true, message: 'Referral commissions are disabled' };
      }

      const { data: settingData } = await supabase
        .from('referral_settings')
        .select('setting_value')
        .eq('setting_name', 'base_commission_rate')
        .eq('is_active', true)
        .single();

      // Use configurable rate or fallback to 5%
      const commissionRate = settingData?.setting_value || 0.05;
      const commissionAmount = transactionAmount * commissionRate;

      // Determine commission status: 'paid' for full share purchases, 'pending' for others
      const isPaidImmediately = transactionType === 'share_purchase';
      const commissionStatus = isPaidImmediately ? 'paid' : 'pending';

      // Create referral commission record
      const { error: commissionError } = await supabase
        .from('referral_commissions')
        .insert({
          referrer_id: referrerId,
          referred_id: referredUserId,
          commission_amount: commissionAmount,
          commission_rate: commissionRate,
          source_amount: transactionAmount,
          earning_type: transactionType,
          currency,
          status: commissionStatus,
          paid_at: isPaidImmediately ? new Date().toISOString() : null
        });

      if (commissionError) throw commissionError;

      // Create referral activity record
      const { error: activityError } = await supabase
        .from('referral_activities')
        .insert({
          referrer_id: referrerId,
          referred_id: referredUserId,
          activity_type: 'purchase_commission',
          commission_earned: commissionAmount,
          status: 'processed',
          metadata: {
            transaction_amount: transactionAmount,
            transaction_type: transactionType,
            commission_rate: commissionRate
          }
        });

      if (activityError) throw activityError;

      // Update referrer's statistics
      const { data: currentStats } = await supabase
        .from('referral_statistics')
        .select('pending_earnings, total_earnings')
        .eq('user_id', referrerId)
        .single();

      const currentPending = currentStats?.pending_earnings || 0;
      const currentTotal = currentStats?.total_earnings || 0;

      const { error: statsError } = await supabase
        .from('referral_statistics')
        .upsert({
          user_id: referrerId,
          pending_earnings: isPaidImmediately ? currentPending : currentPending + commissionAmount,
          total_earnings: currentTotal + commissionAmount,
          updated_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (statsError) {
        console.warn('Could not update referral statistics:', statsError);
        // Don't throw error - the commission tracking is still successful
      }

      return { 
        success: true, 
        commissionAmount,
        referrerId,
        message: 'Referral commission tracked successfully' 
      };

    } catch (error) {
      console.error('Error tracking referral commission:', error);
      return { 
        success: false, 
        error,
        message: 'Failed to track referral commission' 
      };
    }
  };

  return {
    trackReferralCommission
  };
};