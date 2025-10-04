import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header (admin only)
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single();

    if (profile?.user_role !== 'admin') {
      throw new Error('Admin access required');
    }

    const { draw_id } = await req.json();

    if (!draw_id) {
      throw new Error('Draw ID required');
    }

    console.log(`Triggering draw: ${draw_id}`);

    // Get draw details
    const { data: draw, error: drawError } = await supabase
      .from('grand_draws')
      .select('*')
      .eq('id', draw_id)
      .single();

    if (drawError || !draw) {
      throw new Error('Draw not found');
    }

    if (draw.status !== 'open' && draw.status !== 'closed') {
      throw new Error(`Draw must be open or closed to run. Current status: ${draw.status}`);
    }

    // Get all entries for this draw
    const { data: entries, error: entriesError } = await supabase
      .from('draw_entries')
      .select('*')
      .eq('draw_id', draw_id)
      .eq('status', 'active');

    if (entriesError) {
      throw new Error('Failed to load draw entries');
    }

    if (!entries || entries.length === 0) {
      throw new Error('No entries for this draw');
    }

    console.log(`Found ${entries.length} entries for draw`);

    // Calculate total prize pool in shares
    const totalCreditsStaked = entries.reduce((sum, e) => sum + e.credits_staked, 0);
    const totalPrizeShares = Math.floor(totalCreditsStaked * draw.first_prize_percentage / 100) +
                             Math.floor(totalCreditsStaked * draw.second_prize_percentage / 100) +
                             Math.floor(totalCreditsStaked * draw.third_prize_percentage / 100);

    // Select 3 random winners (weighted by stakes)
    const weightedEntries: any[] = [];
    entries.forEach(entry => {
      // Add entry multiple times based on credits staked (weight)
      for (let i = 0; i < entry.credits_staked; i++) {
        weightedEntries.push(entry);
      }
    });

    // Shuffle and pick 3 unique winners
    const shuffled = weightedEntries.sort(() => Math.random() - 0.5);
    const uniqueWinners = new Map();
    let winnerCount = 0;
    const winners = [];

    for (const entry of shuffled) {
      if (!uniqueWinners.has(entry.user_id) && winnerCount < 3) {
        uniqueWinners.set(entry.user_id, true);
        winners.push(entry);
        winnerCount++;
      }
      if (winnerCount === 3) break;
    }

    if (winners.length < 3) {
      throw new Error('Not enough unique participants for 3 winners');
    }

    const firstWinner = winners[0];
    const secondWinner = winners[1];
    const thirdWinner = winners[2];

    const firstPrizeShares = Math.floor(totalCreditsStaked * draw.first_prize_percentage / 100);
    const secondPrizeShares = Math.floor(totalCreditsStaked * draw.second_prize_percentage / 100);
    const thirdPrizeShares = Math.floor(totalCreditsStaked * draw.third_prize_percentage / 100);

    // Update draw with results
    const { error: updateDrawError } = await supabase
      .from('grand_draws')
      .update({
        status: 'drawn',
        first_winner_id: firstWinner.user_id,
        second_winner_id: secondWinner.user_id,
        third_winner_id: thirdWinner.user_id,
        first_prize_shares: firstPrizeShares,
        second_prize_shares: secondPrizeShares,
        third_prize_shares: thirdPrizeShares,
        drawn_at: new Date().toISOString(),
        drawn_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draw_id);

    if (updateDrawError) {
      throw new Error('Failed to update draw');
    }

    // Create winner records
    const winnerRecords = [
      {
        draw_id,
        user_id: firstWinner.user_id,
        position: 1,
        prize_shares: firstPrizeShares,
        prize_percentage: draw.first_prize_percentage,
        credits_staked: firstWinner.credits_staked,
      },
      {
        draw_id,
        user_id: secondWinner.user_id,
        position: 2,
        prize_shares: secondPrizeShares,
        prize_percentage: draw.second_prize_percentage,
        credits_staked: secondWinner.credits_staked,
      },
      {
        draw_id,
        user_id: thirdWinner.user_id,
        position: 3,
        prize_shares: thirdPrizeShares,
        prize_percentage: draw.third_prize_percentage,
        credits_staked: thirdWinner.credits_staked,
      },
    ];

    const { error: winnersError } = await supabase
      .from('draw_winners')
      .insert(winnerRecords);

    if (winnersError) {
      console.error('Failed to create winner records:', winnersError);
    }

    // Update entry statuses
    const { error: statusError } = await supabase
      .from('draw_entries')
      .update({ status: 'lost' })
      .eq('draw_id', draw_id);

    if (statusError) {
      console.error('Failed to update entry statuses:', statusError);
    }

    // Mark winners
    for (const winner of winners) {
      await supabase
        .from('draw_entries')
        .update({ status: 'won' })
        .eq('draw_id', draw_id)
        .eq('user_id', winner.user_id);
    }

    // Award prizes (add credits to winners as prize_won)
    for (let i = 0; i < winners.length; i++) {
      const winner = winners[i];
      const prizeShares = i === 0 ? firstPrizeShares : i === 1 ? secondPrizeShares : thirdPrizeShares;
      
      // Log prize as credit transaction
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: winner.user_id,
          transaction_type: 'prize_won',
          amount: prizeShares,
          balance_after: 0, // Will be calculated
          source_type: 'grand_draw',
          source_id: draw_id,
          description: `Won ${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : 'rd'} prize: ${prizeShares} shares`,
          metadata: {
            draw_id,
            position: i + 1,
            prize_percentage: i === 0 ? draw.first_prize_percentage : i === 1 ? draw.second_prize_percentage : draw.third_prize_percentage,
          },
        });

      // Issue shares to winners via transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: winner.user_id,
          transaction_type: 'share_purchase',
          amount: 0,
          currency: 'UGX',
          status: 'completed',
          description: `Grand Draw Prize: Won ${prizeShares} shares`,
          metadata: {
            is_draw_prize: true,
            draw_id,
            position: i + 1,
            shares_won: prizeShares,
          },
        });
    }

    console.log(`Draw ${draw_id} completed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Draw completed successfully',
        data: {
          draw_id,
          winners: winnerRecords,
          total_prize_shares: totalPrizeShares,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error in trigger-grand-draw:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
