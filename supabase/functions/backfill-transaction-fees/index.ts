import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting transaction fee backfill process...');

    // Get transactions without fees that should have them
    const { data: transactionsWithoutFees, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .is('fee_amount', null)
      .in('transaction_type', ['withdraw', 'withdrawal_request', 'transfer', 'deposit'])
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching transactions:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${transactionsWithoutFees?.length || 0} transactions without fees`);

    let processedCount = 0;
    let errorCount = 0;

    for (const transaction of transactionsWithoutFees || []) {
      try {
        // Get fee settings for this transaction type
        let transactionTypeForFee = transaction.transaction_type;
        // Map withdrawal_request to withdraw for fee calculation
        if (transaction.transaction_type === 'withdrawal_request') {
          transactionTypeForFee = 'withdraw';
        }
        // Map transfer to funds_transfer for fee calculation
        if (transaction.transaction_type === 'transfer') {
          transactionTypeForFee = 'funds_transfer';
        }

        const { data: feeSettings } = await supabase
          .rpc('get_transaction_fee_settings', { 
            p_transaction_type: transactionTypeForFee 
          });

        let feeAmount = 0;
        let feePercentage = 0;
        let flatFee = 0;

        if (feeSettings && feeSettings.length > 0) {
          const settings = feeSettings[0];
          feePercentage = settings.fee_percentage || 0;
          flatFee = settings.flat_fee || 0;
          
          const percentageFeeCalc = (Math.abs(transaction.amount) * feePercentage) / 100;
          feeAmount = percentageFeeCalc + flatFee;
          
          // Apply min/max limits
          if (settings.minimum_fee && feeAmount < settings.minimum_fee) {
            feeAmount = settings.minimum_fee;
          }
          if (settings.maximum_fee && feeAmount > settings.maximum_fee) {
            feeAmount = settings.maximum_fee;
          }
        }

        // Update transaction with fee data
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            fee_amount: feeAmount,
            fee_percentage: feePercentage,
            flat_fee: flatFee
          })
          .eq('id', transaction.id);

        if (updateError) {
          console.error(`Error updating transaction ${transaction.id}:`, updateError);
          errorCount++;
          continue;
        }

        // Create fee collection record if fee > 0
        if (feeAmount > 0) {
          await supabase.rpc('allocate_transaction_fee_enhanced', {
            p_transaction_id: transaction.id,
            p_user_id: transaction.user_id,
            p_transaction_type: transaction.transaction_type,
            p_base_amount: Math.abs(transaction.amount),
            p_fee_amount: feeAmount,
            p_currency: transaction.currency
          });
        }

        processedCount++;
        
        if (processedCount % 10 === 0) {
          console.log(`Processed ${processedCount} transactions...`);
        }

      } catch (error) {
        console.error(`Error processing transaction ${transaction.id}:`, error);
        errorCount++;
      }
    }

    const response = {
      success: true,
      message: 'Transaction fee backfill completed',
      results: {
        total_transactions_found: transactionsWithoutFees?.length || 0,
        successfully_processed: processedCount,
        errors: errorCount
      }
    };

    console.log('Backfill completed:', response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in backfill-transaction-fees function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: (error as Error).message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);