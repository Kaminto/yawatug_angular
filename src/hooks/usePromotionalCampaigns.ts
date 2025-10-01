import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PromotionalCampaign {
  id: string;
  name: string;
  campaign_type: string;
  description: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  target_audience: string;
  discount_percentage: number | null;
  bonus_shares_quantity: number | null;
  bonus_amount: number | null;
  bonus_currency: string | null;
  royalty_percentage: number | null;
  priority: number;
}

interface CampaignBenefit {
  type: 'discount' | 'bonus_shares' | 'cashback' | 'royalty';
  value: number;
  currency?: string;
  description: string;
  [key: string]: any;
}

export const usePromotionalCampaigns = (userEmail?: string) => {
  const [activeCampaigns, setActiveCampaigns] = useState<PromotionalCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [applicableBenefits, setApplicableBenefits] = useState<CampaignBenefit[]>([]);

  useEffect(() => {
    fetchActiveCampaigns();
  }, []);

  useEffect(() => {
    if (userEmail && activeCampaigns.length > 0) {
      checkUserEligibility();
    }
  }, [userEmail, activeCampaigns]);

  const fetchActiveCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('promotional_campaigns')
        .select('*')
        .eq('is_active', true)
        .lte('starts_at', new Date().toISOString())
        .gte('ends_at', new Date().toISOString())
        .order('priority', { ascending: false });

      if (error) throw error;
      setActiveCampaigns((data || []) as unknown as PromotionalCampaign[]);
    } catch (error) {
      console.error('Error fetching active campaigns:', error);
      setActiveCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const checkUserEligibility = async () => {
    if (!userEmail) return;

    try {
      // Check if user exists and has made purchases before
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, created_at')
        .eq('email', userEmail)
        .maybeSingle();

      if (profileError) {
        console.error('Error checking user profile:', profileError);
        return;
      }

      const isNewUser = !userProfile;
      let isFirstTimeBuyer = true;

      if (userProfile) {
        // Check if user has made any share purchases before
        const { data: purchases, error: purchaseError } = await supabase
          .from('share_purchase_orders')
          .select('id')
          .eq('user_id', userProfile.id)
          .eq('status', 'completed')
          .limit(1);

        if (purchaseError) {
          console.error('Error checking purchase history:', purchaseError);
          return;
        }

        isFirstTimeBuyer = !purchases || purchases.length === 0;
      }

      // Filter campaigns based on eligibility
      const eligibleCampaigns = activeCampaigns.filter(campaign => {
        if (campaign.target_audience === 'new_users' && !isNewUser) return false;
        if (campaign.target_audience === 'first_time_buyers' && !isFirstTimeBuyer) return false;
        return true;
      });

      // Convert campaigns to benefits
      const benefits: CampaignBenefit[] = [];
      
      eligibleCampaigns.forEach(campaign => {
        if (campaign.discount_percentage && campaign.discount_percentage > 0) {
          benefits.push({
            type: 'discount',
            value: campaign.discount_percentage,
            description: `${campaign.discount_percentage}% discount on your first investment`
          });
        }

        if (campaign.bonus_shares_quantity && campaign.bonus_shares_quantity > 0) {
          benefits.push({
            type: 'bonus_shares',
            value: campaign.bonus_shares_quantity,
            description: `${campaign.bonus_shares_quantity} bonus shares on your first purchase`
          });
        }

        if (campaign.bonus_amount && campaign.bonus_amount > 0) {
          benefits.push({
            type: 'cashback',
            value: campaign.bonus_amount,
            currency: campaign.bonus_currency || 'UGX',
            description: `${campaign.bonus_currency || 'UGX'} ${campaign.bonus_amount.toLocaleString()} cashback bonus`
          });
        }

        if (campaign.royalty_percentage && campaign.royalty_percentage > 0) {
          benefits.push({
            type: 'royalty',
            value: campaign.royalty_percentage,
            description: `${campaign.royalty_percentage}% additional royalty on dividends`
          });
        }
      });

      setApplicableBenefits(benefits);
    } catch (error) {
      console.error('Error checking user eligibility:', error);
      setApplicableBenefits([]);
    }
  };

  const calculateDiscountedAmount = (originalAmount: number): { discountedAmount: number, savings: number } => {
    const discountBenefit = applicableBenefits.find(b => b.type === 'discount');
    if (!discountBenefit) {
      return { discountedAmount: originalAmount, savings: 0 };
    }

    const savings = Math.round(originalAmount * (discountBenefit.value / 100));
    const discountedAmount = originalAmount - savings;
    
    return { discountedAmount, savings };
  };

  const getBonusShares = (): number => {
    const bonusBenefit = applicableBenefits.find(b => b.type === 'bonus_shares');
    return bonusBenefit ? bonusBenefit.value : 0;
  };

  const getCashbackAmount = (): { amount: number, currency: string } => {
    const cashbackBenefit = applicableBenefits.find(b => b.type === 'cashback');
    return cashbackBenefit 
      ? { amount: cashbackBenefit.value, currency: cashbackBenefit.currency || 'UGX' }
      : { amount: 0, currency: 'UGX' };
  };

  const recordCampaignUsage = async (userId: string, transactionId: string) => {
    if (applicableBenefits.length === 0) return;

    try {
      const campaignUsagePromises = activeCampaigns
        .filter(campaign => 
          applicableBenefits.some(benefit => {
            if (benefit.type === 'discount' && campaign.discount_percentage) return true;
            if (benefit.type === 'bonus_shares' && campaign.bonus_shares_quantity) return true;
            if (benefit.type === 'cashback' && campaign.bonus_amount) return true;
            if (benefit.type === 'royalty' && campaign.royalty_percentage) return true;
            return false;
          })
        )
        .map(campaign => {
          // Disabled - campaign_user_usage table doesn't exist
          console.log('Campaign usage tracking disabled for campaign:', campaign.name);
          return Promise.resolve({ data: null, error: null });
        });

      await Promise.all(campaignUsagePromises);
    } catch (error) {
      console.error('Error recording campaign usage:', error);
    }
  };

  return {
    activeCampaigns,
    applicableBenefits,
    loading,
    calculateDiscountedAmount,
    getBonusShares,
    getCashbackAmount,
    recordCampaignUsage,
    refreshCampaigns: fetchActiveCampaigns
  };
};