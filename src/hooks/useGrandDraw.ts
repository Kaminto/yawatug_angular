import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GrandDraw {
  id: string;
  draw_name: string;
  draw_type: 'daily' | 'weekly' | 'monthly' | 'special';
  draw_date: string;
  status: 'open' | 'closed' | 'drawn' | 'completed' | 'cancelled';
  total_staked_credits: number;
  total_entries: number;
  first_prize_percentage: number;
  second_prize_percentage: number;
  third_prize_percentage: number;
  first_winner_id?: string;
  second_winner_id?: string;
  third_winner_id?: string;
  first_prize_shares?: number;
  second_prize_shares?: number;
  third_prize_shares?: number;
  drawn_at?: string;
  created_at: string;
}

interface DrawEntry {
  id: string;
  draw_id: string;
  user_id: string;
  credits_staked: number;
  entry_number: number;
  status: 'active' | 'won' | 'lost' | 'refunded';
  created_at: string;
}

interface DrawWinner {
  id: string;
  draw_id: string;
  user_id: string;
  position: number;
  prize_shares: number;
  prize_percentage: number;
  credits_staked: number;
  claimed: boolean;
  created_at: string;
  user_profile?: {
    full_name: string;
  };
}

export const useGrandDraw = (userId?: string) => {
  const [currentDraw, setCurrentDraw] = useState<GrandDraw | null>(null);
  const [pastDraws, setPastDraws] = useState<GrandDraw[]>([]);
  const [userEntry, setUserEntry] = useState<DrawEntry | null>(null);
  const [recentWinners, setRecentWinners] = useState<DrawWinner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDrawData = async () => {
      try {
        // Load current open draw
        const { data: openDraw, error: openError } = await supabase
          .from('grand_draws')
          .select('*')
          .eq('status', 'open')
          .order('draw_date', { ascending: true })
          .limit(1)
          .single();

        if (openError && openError.code !== 'PGRST116') {
          console.error('Error loading open draw:', openError);
        } else {
          setCurrentDraw(openDraw as GrandDraw);
        }

        // Load user's entry for current draw
        if (userId && openDraw) {
          const { data: entry, error: entryError } = await supabase
            .from('draw_entries')
            .select('*')
            .eq('draw_id', openDraw.id)
            .eq('user_id', userId)
            .single();

          if (entryError && entryError.code !== 'PGRST116') {
            console.error('Error loading user entry:', entryError);
          } else {
            setUserEntry(entry as DrawEntry);
          }
        }

        // Load past draws (completed)
        const { data: completed, error: completedError } = await supabase
          .from('grand_draws')
          .select('*')
          .in('status', ['drawn', 'completed'])
          .order('draw_date', { ascending: false })
          .limit(10);

        if (completedError) {
          console.error('Error loading past draws:', completedError);
        } else {
          setPastDraws((completed || []) as GrandDraw[]);
        }

        // Load recent winners (public)
        const { data: winners, error: winnersError } = await supabase
          .from('draw_winners')
          .select(`
            *,
            user_profile:profiles!user_id (
              full_name
            )
          `)
          .order('created_at', { ascending: false })
          .limit(15);

        if (winnersError) {
          console.error('Error loading winners:', winnersError);
        } else {
          setRecentWinners(winners || []);
        }
      } catch (error) {
        console.error('Error in loadDrawData:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDrawData();

    // Real-time subscription
    const channel = supabase
      .channel('draw-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grand_draws',
        },
        () => {
          loadDrawData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const enterDraw = async (creditsToStake: number) => {
    if (!userId || !currentDraw) {
      throw new Error('User not logged in or no active draw');
    }

    const { data, error } = await supabase
      .from('draw_entries')
      .insert({
        draw_id: currentDraw.id,
        user_id: userId,
        credits_staked: creditsToStake,
        entry_number: currentDraw.total_entries + 1,
      })
      .select()
      .single();

    if (error) throw error;
    setUserEntry(data as DrawEntry);
    return data;
  };

  return {
    currentDraw,
    pastDraws,
    userEntry,
    recentWinners,
    loading,
    enterDraw,
  };
};
