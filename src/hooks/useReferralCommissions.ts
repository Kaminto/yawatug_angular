import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ReferralCommission {
  id: string;
  referrer_id: string;
  referred_id: string;
  commission_amount: number;
  commission_rate: number;
  source_amount: number;
  earning_type: string;
  commission_type: string;
  is_from_installment: boolean;
  status: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  transaction_id?: string;
  booking_id?: string;
  installment_payment_id?: string;
  referred_profile?: {
    full_name: string;
    email: string;
  };
}

interface EnhancedReferralEarnings {
  totalEarned: number;        // Commissions from completed payments (status = 'paid')
  totalExpected: number;      // Expected commissions from all bookings (status = 'pending')
  installmentEarned: number;  // Earned from installment payments
  directEarned: number;       // Earned from direct purchases
  breakdown: {
    directPurchases: ReferralCommission[];
    installmentPayments: ReferralCommission[];
    expectedFromBookings: ReferralCommission[];
  };
}

export const useReferralCommissions = (userId: string) => {
  const [commissions, setCommissions] = useState<ReferralCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [enhancedEarnings, setEnhancedEarnings] = useState<EnhancedReferralEarnings>({
    totalEarned: 0,
    totalExpected: 0,
    installmentEarned: 0,
    directEarned: 0,
    breakdown: {
      directPurchases: [],
      installmentPayments: [],
      expectedFromBookings: []
    }
  });

  useEffect(() => {
    if (!userId) return;

    const loadEnhancedCommissions = async () => {
      try {
        // Load all referral commissions with enhanced tracking
        const { data, error } = await supabase
          .from('referral_commissions')
          .select(`
            *,
            referred_profile:profiles!referred_id (
              full_name,
              email
            )
          `)
          .eq('referrer_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading referral commissions:', error);
          return;
        }

        const commissionData = data || [];
        setCommissions(commissionData);

        // Calculate enhanced earnings breakdown
        const directPurchases = commissionData.filter(c => 
          c.commission_type === 'direct_purchase' && c.status === 'paid'
        );
        
        const installmentPayments = commissionData.filter(c => 
          c.commission_type === 'installment_payment' && c.status === 'paid'
        );
        
        const expectedFromBookings = commissionData.filter(c => 
          c.commission_type === 'expected_installment' && c.status === 'pending'
        );

        const directEarned = directPurchases.reduce((sum, c) => sum + (c.commission_amount || 0), 0);
        const installmentEarned = installmentPayments.reduce((sum, c) => sum + (c.commission_amount || 0), 0);
        const totalEarned = directEarned + installmentEarned;
        const totalExpected = expectedFromBookings.reduce((sum, c) => sum + (c.commission_amount || 0), 0);

        setEnhancedEarnings({
          totalEarned,
          totalExpected,
          installmentEarned,
          directEarned,
          breakdown: {
            directPurchases,
            installmentPayments,
            expectedFromBookings
          }
        });

      } catch (error) {
        console.error('Error in loadEnhancedCommissions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEnhancedCommissions();
  }, [userId]);

  return {
    commissions,
    loading,
    enhancedEarnings,
    // Legacy support
    totalEarnings: enhancedEarnings.totalEarned,
    pendingEarnings: enhancedEarnings.totalExpected
  };
};