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

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { credits_to_convert } = await req.json();

    if (!credits_to_convert || credits_to_convert < 1) {
      throw new Error('Invalid credit amount');
    }

    console.log(`Converting ${credits_to_convert} credits for user ${user.id}`);

    // Get conversion settings
    const { data: settings, error: settingsError } = await supabase
      .from('credit_conversion_settings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (settingsError || !settings) {
      throw new Error('Conversion settings not configured');
    }

    // Validate minimum conversion amount
    if (credits_to_convert < settings.minimum_conversion_amount) {
      throw new Error(`Minimum conversion amount is ${settings.minimum_conversion_amount} credits`);
    }

    // Get user's credit balance
    const { data: creditBalance, error: balanceError } = await supabase
      .from('referral_credits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (balanceError || !creditBalance) {
      throw new Error('Credit balance not found');
    }

    if (creditBalance.available_credits < credits_to_convert) {
      throw new Error('Insufficient credits');
    }

    // Calculate shares to receive
    const shares_to_receive = credits_to_convert * settings.shares_per_credit;

    // Start transaction: Update credits, create transaction, issue shares
    
    // 1. Update credit balance
    const new_available = creditBalance.available_credits - credits_to_convert;
    const new_converted = creditBalance.converted_credits + credits_to_convert;

    const { error: updateError } = await supabase
      .from('referral_credits')
      .update({
        available_credits: new_available,
        converted_credits: new_converted,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      throw new Error('Failed to update credit balance');
    }

    // 2. Log credit transaction
    const { error: txError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'converted',
        amount: credits_to_convert,
        balance_after: new_available,
        source_type: 'credit_conversion',
        description: `Converted ${credits_to_convert} credits to ${shares_to_receive} shares`,
        metadata: {
          shares_received: shares_to_receive,
          conversion_rate: settings.shares_per_credit,
        },
      });

    if (txError) {
      console.error('Failed to log credit transaction:', txError);
    }

    // 3. Issue shares (add to user_shares table)
    // Note: This assumes you have a way to issue bonus shares to users
    // You may need to adapt this to your shares system
    const { error: sharesError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'share_purchase',
        amount: 0, // No monetary cost
        currency: 'UGX',
        status: 'completed',
        description: `Credit conversion: ${credits_to_convert} credits → ${shares_to_receive} shares`,
        metadata: {
          is_credit_conversion: true,
          credits_used: credits_to_convert,
          shares_issued: shares_to_receive,
        },
      });

    if (sharesError) {
      console.error('Failed to record share transaction:', sharesError);
    }

    console.log(`Successfully converted ${credits_to_convert} credits to ${shares_to_receive} shares for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully converted ${credits_to_convert} credits to ${shares_to_receive} shares`,
        data: {
          credits_converted: credits_to_convert,
          shares_received: shares_to_receive,
          remaining_credits: new_available,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error in convert-credits-to-shares:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
