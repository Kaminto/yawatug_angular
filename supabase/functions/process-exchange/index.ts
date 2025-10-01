import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExchangeRequest {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  exchangeRate: number;
  description?: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid authorization')
    }

    const { fromCurrency, toCurrency, amount, exchangeRate, description }: ExchangeRequest = await req.json()

    if (!amount || amount <= 0) {
      throw new Error('Valid amount is required')
    }

    if (!fromCurrency || !toCurrency) {
      throw new Error('Both currencies are required')
    }

    if (!exchangeRate || exchangeRate <= 0) {
      throw new Error('Valid exchange rate is required')
    }

    console.log('Processing exchange for user:', user.id, { fromCurrency, toCurrency, amount, exchangeRate })

    // Get wallet IDs
    const { data: sourceWallet, error: sourceWalletError } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', user.id)
      .eq('currency', fromCurrency)
      .single()

    if (sourceWalletError || !sourceWallet) {
      throw new Error(`${fromCurrency} wallet not found`)
    }

    const { data: destWallet, error: destWalletError } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', user.id)
      .eq('currency', toCurrency)
      .single()

    if (destWalletError || !destWallet) {
      throw new Error(`${toCurrency} wallet not found`)
    }

    // Get fee settings for exchange
    const { data: feeSettings } = await supabase
      .from('transaction_fee_settings')
      .select('*')
      .eq('transaction_type', 'exchange')
      .eq('currency', fromCurrency)
      .eq('fee_collection_enabled', true)
      .single()

    // Calculate fee
    let feeAmount = 0
    if (feeSettings) {
      const percentageFee = (amount * (feeSettings.percentage_fee || 0)) / 100
      const flatFee = feeSettings.flat_fee || 0
      feeAmount = percentageFee + flatFee
      
      if (feeSettings.minimum_fee && feeAmount < feeSettings.minimum_fee) {
        feeAmount = feeSettings.minimum_fee
      }
      if (feeSettings.maximum_fee && feeAmount > feeSettings.maximum_fee) {
        feeAmount = feeSettings.maximum_fee
      }
    }

    const convertedAmount = amount * exchangeRate

    // Use database function that validates balance and creates transactions atomically
    const { data: exchangeResult, error: exchangeError } = await supabase.rpc('create_exchange_transaction', {
      p_user_id: user.id,
      p_from_wallet_id: sourceWallet.id,
      p_to_wallet_id: destWallet.id,
      p_from_amount: amount,
      p_to_amount: convertedAmount,
      p_from_currency: fromCurrency,
      p_to_currency: toCurrency,
      p_exchange_rate: exchangeRate,
      p_fee_amount: feeAmount,
      p_description: description || `Exchange ${fromCurrency} to ${toCurrency}`
    })

    if (exchangeError) {
      console.error('Exchange error:', exchangeError)
      throw new Error(exchangeError.message || 'Failed to create exchange transaction')
    }

    console.log('Exchange completed successfully:', exchangeResult)

    return new Response(
      JSON.stringify({
        success: true,
        transaction: {
          debit_id: exchangeResult.debit_transaction_id,
          credit_id: exchangeResult.credit_transaction_id,
          amount,
          fee_amount: feeAmount,
          total_deducted: amount + feeAmount,
          converted_amount: convertedAmount,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          exchange_rate: exchangeRate,
          status: 'completed',
          reference: exchangeResult.exchange_reference
        },
        message: 'Exchange completed successfully'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )

  } catch (error: any) {
    console.error('Error in process-exchange:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process exchange',
        success: false
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  }
}

Deno.serve(handler)