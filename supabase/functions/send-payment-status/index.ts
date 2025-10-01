import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentStatusPayload {
  status: string | null;
  message: string | null;
  reference: string | null;
  msisdn: string | null;
  amount: number | null;
  currency: string | null;
  network: string | null;
  provider_charge: number | null;
  transaction_id: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Payment status webhook received');

    const payload: PaymentStatusPayload = await req.json();
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    // Validate required fields
    if (!payload.reference) {
      console.error('❌ Missing reference in payload');
      return new Response(
        JSON.stringify({ success: false, error: 'Reference is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.status) {
      console.error('❌ Missing status in payload');
      return new Response(
        JSON.stringify({ success: false, error: 'Status is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Search for transaction by reference
    console.log(`🔍 Searching for transaction with reference: ${payload.reference}`);
    const { data: transaction, error: searchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('reference', payload.reference)
      .maybeSingle();

    if (searchError) {
      console.error('❌ Error searching transaction:', searchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to search transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!transaction) {
      console.warn('⚠️ Transaction not found with reference:', payload.reference);
      return new Response(
        JSON.stringify({ success: false, error: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Transaction found:', transaction.id);

    // Prepare update data
    const updateData: any = {
      status: payload.status,
      updated_at: new Date().toISOString()
    };

    // Add optional fields to metadata
    const metadata: any = transaction.metadata || {};
    if (payload.message) metadata.payment_message = payload.message;
    if (payload.msisdn) metadata.payment_msisdn = payload.msisdn;
    if (payload.network) metadata.payment_network = payload.network;
    if (payload.provider_charge) metadata.provider_charge = payload.provider_charge;
    if (payload.transaction_id) metadata.provider_transaction_id = payload.transaction_id;

    updateData.metadata = metadata;

    // Update gateway_reference if provider transaction_id is present
    if (payload.transaction_id) {
      updateData.gateway_reference = payload.transaction_id;
    }

    // Update the transaction
    console.log('🔄 Updating transaction status to:', payload.status);
    const { error: updateError } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', transaction.id);

    if (updateError) {
      console.error('❌ Error updating transaction:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Transaction updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Transaction status updated successfully',
        transaction_id: transaction.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
