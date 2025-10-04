import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransactionRequest {
  transactionType: 'deposit' | 'withdraw' | 'transfer' | 'exchange';
  amount: number;
  currency: string;
  walletId: string;
  description?: string;
  metadata?: Record<string, any>;
  recipientId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  toCurrency?: string;
  toWalletId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: TransactionRequest = await req.json();
    console.log('Processing unified transaction:', body);

    // Validate user status
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('status, verification_status')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    if (profile.status === 'blocked' || profile.status === 'suspended') {
      throw new Error('Account is restricted. Please contact support.');
    }

    // Validate wallet status
    const { data: wallet, error: walletError } = await supabaseClient
      .from('wallets')
      .select('balance, status, currency')
      .eq('id', body.walletId)
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      throw new Error('Wallet not found or access denied');
    }

    if (wallet.status !== 'active') {
      throw new Error(`Wallet is ${wallet.status}. Please contact support.`);
    }

    if (wallet.currency !== body.currency) {
      throw new Error('Currency mismatch');
    }

    // Get transaction fee
    const { data: feeSettings } = await supabaseClient
      .from('transaction_fee_settings')
      .select('*')
      .eq('transaction_type', body.transactionType)
      .eq('currency', body.currency)
      .eq('is_active', true)
      .single();

    let feeAmount = 0;
    if (feeSettings) {
      const percentageFee = (body.amount * (feeSettings.percentage_fee || 0)) / 100;
      const flatFee = feeSettings.flat_fee || 0;
      feeAmount = Math.max(
        percentageFee + flatFee,
        feeSettings.minimum_fee || 0
      );
      if (feeSettings.maximum_fee && feeSettings.maximum_fee > 0) {
        feeAmount = Math.min(feeAmount, feeSettings.maximum_fee);
      }
    }

    // Validate balance for withdrawals/transfers/exchanges
    if (['withdraw', 'transfer', 'exchange'].includes(body.transactionType)) {
      const totalRequired = body.amount + feeAmount;
      if (wallet.balance < totalRequired) {
        throw new Error(`Insufficient balance. Required: ${body.currency} ${totalRequired.toLocaleString()}, Available: ${body.currency} ${wallet.balance.toLocaleString()}`);
      }

      // Check for negative balance
      if (wallet.balance < 0) {
        throw new Error('Wallet has negative balance. Please contact support.');
      }
    }

    // Validate daily limits
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayTransactions } = await supabaseClient
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('transaction_type', body.transactionType)
      .eq('currency', body.currency)
      .gte('created_at', today.toISOString())
      .eq('status', 'completed');

    const totalToday = (todayTransactions || []).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const dailyLimit = 50000000; // 50M default

    if (totalToday + body.amount > dailyLimit) {
      throw new Error(`Daily limit exceeded. Limit: ${body.currency} ${dailyLimit.toLocaleString()}`);
    }

    // Generate reference
    const reference = `${body.transactionType.toUpperCase()}-${Date.now()}-${user.id.slice(0, 8)}`;

    // Create transaction record
    const transactionAmount = body.transactionType === 'deposit' 
      ? body.amount 
      : -body.amount;

    const { data: transaction, error: txError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: user.id,
        wallet_id: body.walletId,
        transaction_type: body.transactionType,
        amount: transactionAmount,
        currency: body.currency,
        status: 'pending',
        approval_status: 'pending',
        reference,
        description: body.description || `${body.transactionType} transaction`,
        fee_amount: feeAmount,
        metadata: body.metadata || {}
      })
      .select()
      .single();

    if (txError) {
      console.error('Transaction creation error:', txError);
      throw new Error('Failed to create transaction record');
    }

    console.log('Transaction created successfully:', transaction.id);

    // Log transaction for audit
    await supabaseClient
      .from('transaction_audit_logs')
      .insert({
        transaction_id: transaction.id,
        user_id: user.id,
        action: 'created',
        details: {
          type: body.transactionType,
          amount: body.amount,
          currency: body.currency,
          fee: feeAmount,
          reference
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        transaction: {
          id: transaction.id,
          reference,
          amount: body.amount,
          currency: body.currency,
          fee: feeAmount,
          status: 'pending',
          created_at: transaction.created_at
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error processing transaction:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to process transaction'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
