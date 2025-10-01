
import { supabase } from '@/integrations/supabase/client';

export interface ShareDistribution {
  totalShares: number;
  soldShares: number;
  availableShares: number;
  reservedShares: number;
  netReservedShares: number;
  reservedIssued: number;
}

export const calculateShareDistribution = async (shareId?: string): Promise<ShareDistribution> => {
  try {
    // Get share pool data - use specific share name to ensure single result
    const { data: shareData, error: shareError } = await supabase
      .from('shares')
      .select('total_shares, available_shares, reserved_shares, reserved_issued')
      .eq('name', 'Yawatu Ordinary Shares')
      .single();

    if (shareError) {
      console.error('Error fetching share data:', shareError);
      throw shareError;
    }

    // Calculate fully owned shares from direct purchases and completed bookings
    const { data: holdings, error: holdingsError } = await supabase
      .from('user_share_holdings')
      .select('quantity');

    if (holdingsError) {
      console.error('Error fetching user holdings:', holdingsError);
      throw holdingsError;
    }

    // Calculate progressively owned shares from active/partially_paid bookings
    const { data: progressiveBookings, error: progressiveError } = await supabase
      .from('share_bookings')
      .select('quantity, shares_owned_progressively, status')
      .in('status', ['active', 'partially_paid']);

    if (progressiveError) {
      console.error('Error fetching progressive bookings:', progressiveError);
      throw progressiveError;
    }

    // Calculate pure bookings (reserved but not yet owned)
    const { data: pureBookings, error: pureBookingsError } = await supabase
      .from('share_bookings')
      .select('quantity, shares_owned_progressively, status')
      .in('status', ['pending', 'active', 'partially_paid']);

    if (pureBookingsError) {
      console.error('Error fetching pure bookings:', pureBookingsError);
      throw pureBookingsError;
    }

    // Calculate totals with progressive ownership
    const fullyOwnedShares = holdings?.reduce((total, holding) => total + holding.quantity, 0) || 0;
    const progressivelyOwnedShares = progressiveBookings?.reduce((total, booking) => total + (booking.shares_owned_progressively || 0), 0) || 0;
    const pureBookedShares = pureBookings?.reduce((total, booking) => total + Math.max(0, booking.quantity - (booking.shares_owned_progressively || 0)), 0) || 0;
    
    // Total sold shares includes both fully owned and progressively owned
    const soldShares = fullyOwnedShares + progressivelyOwnedShares;
    
    // Calculate net reserved shares (reserved - issued)
    const reservedShares = shareData.reserved_shares || 0;
    const reservedIssued = shareData.reserved_issued || 0;
    const netReservedShares = Math.max(0, reservedShares - reservedIssued);
    
    // Calculate actual available shares - subtract sold shares, pure booked shares, and net reserved shares
    const availableShares = Math.max(0, shareData.total_shares - soldShares - pureBookedShares - netReservedShares);

    const distribution: ShareDistribution = {
      totalShares: shareData.total_shares,
      soldShares,
      availableShares,
      reservedShares,
      netReservedShares,
      reservedIssued
    };

    // Validate that numbers add up correctly
    const sum = soldShares + availableShares + pureBookedShares + netReservedShares;
    if (Math.abs(sum - shareData.total_shares) > 0.01) {
      console.warn('Share distribution calculation mismatch:', {
        calculated: sum,
        expected: shareData.total_shares,
        distribution,
        details: {
          fullyOwnedShares,
          progressivelyOwnedShares,
          pureBookedShares,
          netReservedShares,
          availableShares
        }
      });
    }

    return distribution;
  } catch (error) {
    console.error('Error calculating share distribution:', error);
    // Return default values on error
    return {
      totalShares: 0,
      soldShares: 0,
      availableShares: 0,
      reservedShares: 0,
      netReservedShares: 0,
      reservedIssued: 0
    };
  }
};

export const updateShareAvailability = async (shareId: string, distribution: ShareDistribution): Promise<void> => {
  try {
    const { error } = await supabase
      .from('shares')
      .update({
        available_shares: distribution.availableShares,
        updated_at: new Date().toISOString()
      })
      .eq('name', 'Yawatu Ordinary Shares');

    if (error) {
      console.error('Error updating share availability:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error updating share availability:', error);
    throw error;
  }
};
