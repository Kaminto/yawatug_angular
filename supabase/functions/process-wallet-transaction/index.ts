import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WalletTransactionRequest {
  transactionType: string;
  amount: number;
  currency: string;
  description?: string;
  recipientId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  otp?: string;
  otpMethod?: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { 
      transactionType, 
      amount, 
      currency, 
      description,
      recipientId,
      recipientEmail,
      recipientPhone,
      otp,
      otpMethod
    }: WalletTransactionRequest = await req.json();

    // Validate input
    if (!transactionType || !amount || !currency) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: transactionType, amount, currency' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (amount <= 0) {
      return new Response(JSON.stringify({ error: 'Amount must be positive' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .eq('currency', currency)
      .single();

    if (walletError || !wallet) {
      return new Response(JSON.stringify({ error: 'Wallet not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle different transaction types
    let transactionData: any = {
      user_id: user.id,
      wallet_id: wallet.id,
      transaction_type: transactionType,
      amount: transactionType === 'deposit' ? amount : -Math.abs(amount),
      currency,
      description: description || `${transactionType} transaction`,
      status: 'pending',
      approval_status: 'pending'
    };

    // Check balance for withdraw/transfer transactions
    if (['withdraw', 'withdrawal_request', 'transfer'].includes(transactionType)) {
      if (wallet.balance < amount) {
        return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // For transfers, handle recipient
    if (transactionType === 'transfer') {
      let recipientUserId = recipientId;
      
      if (!recipientUserId && (recipientEmail || recipientPhone)) {
        // Find recipient by email or phone
        const { data: recipient } = await supabase
          .from('profiles')
          .select('id')
          .or(`email.eq.${recipientEmail},phone.eq.${recipientPhone}`)
          .single();
        
        if (recipient) {
          recipientUserId = recipient.id;
        }
      }

      if (!recipientUserId) {
        return new Response(JSON.stringify({ error: 'Recipient not found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      transactionData.recipient_id = recipientUserId;
    }

    // Calculate fees with proper transaction type mapping
    let feeTransactionType = transactionType;
    if (transactionType === 'withdrawal_request') {
      feeTransactionType = 'withdraw';
    }
    if (transactionType === 'transfer') {
      feeTransactionType = 'funds_transfer';
    }

    const { data: feeSettings } = await supabase
      .rpc('get_transaction_fee_settings', { p_transaction_type: feeTransactionType });

    let feeAmount = 0;
    if (feeSettings && feeSettings.length > 0) {
      const settings = feeSettings[0];
      const percentageFee = (amount * (settings.fee_percentage || 0)) / 100;
      const flatFee = settings.flat_fee || 0;
      feeAmount = percentageFee + flatFee;
      
      // Apply min/max limits
      if (settings.minimum_fee && feeAmount < settings.minimum_fee) {
        feeAmount = settings.minimum_fee;
      }
      if (settings.maximum_fee && feeAmount > settings.maximum_fee) {
        feeAmount = settings.maximum_fee;
      }
    }

    transactionData.fee_amount = feeAmount;
    transactionData.fee_percentage = feeSettings?.[0]?.fee_percentage || 0;
    transactionData.flat_fee = feeSettings?.[0]?.flat_fee || 0;

    // For debit transactions, check total amount including fees
    const totalDeduction = Math.abs(transactionData.amount) + feeAmount;
    if (['withdraw', 'withdrawal_request', 'transfer'].includes(transactionType) && wallet.balance < totalDeduction) {
      return new Response(JSON.stringify({ 
        error: `Insufficient balance. Required: ${totalDeduction}, Available: ${wallet.balance}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select()
      .single();

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      return new Response(JSON.stringify({ error: 'Failed to create transaction' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Note: Wallet balance is automatically updated by database trigger
    // based on transaction status and approval_status

    // Allocate fees if any
    if (feeAmount > 0) {
      await supabase.rpc('allocate_transaction_fee_with_snapshot', {
        p_transaction_id: transaction.id,
        p_user_id: user.id,
        p_transaction_type: feeTransactionType,
        p_base_amount: amount,
        p_currency: currency
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      transaction,
      message: 'Transaction created successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-wallet-transaction function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);