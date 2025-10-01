import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DepositRequest {
  amount: number;
  currency: string;
  description?: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// SimpleLes API Configuration
const SIMPLELES_API_URL = Deno.env.get('SIMPLELES_API_URL') ?? 'http://payments.simpleles.net:5056/api/wallet/mm-deposit'
const SIMPLELES_API_KEY = Deno.env.get('SIMPLELES_API_KEY') ?? ''

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid authorization')
    }

    const requestBody = await req.json()
    const { amount, currency, description, merchant_code, merchant_transaction_id, phone, network } = requestBody

    if (!amount || amount <= 0) {
      throw new Error('Valid amount is required')
    }

    if (!currency) {
      throw new Error('Currency is required')
    }

    console.log('Processing deposit for user:', user.id, { amount, currency, description })

    // Call SimpleLes API first
    const simplesPayload = {
      account_no: merchant_code || "YEW2024A25E4R",
      reference: merchant_transaction_id || `DEP_${Date.now()}_${user.id.slice(0, 8)}`,
      msisdn: phone || "",
      currency: currency,
      amount: amount.toFixed(2),
      description: description || "Wallet deposit"
    }

    console.log('Calling SimpleLes API:', { url: SIMPLELES_API_URL, payload: simplesPayload })

    let simplesResponse: any = null
    let simplesSuccess = false

    try {
      const apiResponse = await fetch(SIMPLELES_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SIMPLELES_API_KEY}`
        },
        body: JSON.stringify(simplesPayload)
      })

      const responseText = await apiResponse.text()
      console.log('SimpleLes API response:', { status: apiResponse.status, body: responseText })

      try {
        simplesResponse = JSON.parse(responseText)
      } catch {
        simplesResponse = { raw_response: responseText }
      }

      simplesSuccess = apiResponse.ok
    } catch (apiError: any) {
      console.error('SimpleLes API call failed:', apiError)
      simplesResponse = { error: apiError.message, failed: true }
      simplesSuccess = false
    }

    // If SimpleLes API fails, return error but with 200 status
    if (!simplesSuccess) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment provider declined the transaction',
          details: simplesResponse,
          message: 'Unable to process deposit. Please check your payment details and try again.'
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    }

    // Get or create user's wallet for the specified currency
    let { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', user.id)
      .eq('currency', currency)
      .single()

    if (walletError && walletError.code === 'PGRST116') {
      // Wallet doesn't exist, create it
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({
          user_id: user.id,
          currency: currency,
          balance: 0,
          status: 'active'
        })
        .select('id, balance')
        .single()

      if (createError) {
        console.error('Error creating wallet:', createError)
        throw new Error('Failed to create wallet')
      }
      wallet = newWallet
    } else if (walletError) {
      console.error('Wallet lookup error:', walletError)
      throw new Error(`Failed to find ${currency} wallet for user`)
    }

    // Get fee settings for deposit
    const { data: feeSettings } = await supabase
      .from('transaction_fee_settings')
      .select('*')
      .eq('transaction_type', 'deposit')
      .eq('currency', currency)
      .eq('fee_collection_enabled', true)
      .single()

    // Calculate fee
    let feeAmount = 0
    if (feeSettings) {
      const percentageFee = (amount * (feeSettings.percentage_fee || 0)) / 100
      const flatFee = feeSettings.flat_fee || 0
      feeAmount = percentageFee + flatFee
      
      // Apply min/max limits
      if (feeSettings.minimum_fee && feeAmount < feeSettings.minimum_fee) {
        feeAmount = feeSettings.minimum_fee
      }
      if (feeSettings.maximum_fee && feeAmount > feeSettings.maximum_fee) {
        feeAmount = feeSettings.maximum_fee
      }
    }

    const netAmount = amount - feeAmount

    // Prepare admin notes with payment details and provider response
    const adminNotesData = {
      payment_method: 'mobile_money',
      transaction_id: merchant_transaction_id || null,
      phone_number: phone || null,
      network: network || null,
      merchant_code: merchant_code || null,
      timestamp: new Date().toISOString(),
      provider: 'SimpleLes',
      provider_response: simplesResponse,
      api_success: simplesSuccess
    }

    // Create pending deposit transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        wallet_id: wallet?.id,
        transaction_type: 'deposit',
        amount: netAmount,
        currency: currency,
        status: 'pending',
        approval_status: 'pending',
        description: description || 'Deposit request',
        fee_amount: feeAmount,
        fee_percentage: feeSettings?.percentage_fee || 0,
        flat_fee: feeSettings?.flat_fee || 0,
        admin_notes: JSON.stringify(adminNotesData),
        reference: `DEP-${Date.now()}-${user.id.slice(0, 8)}`
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Transaction creation error:', transactionError)
      throw new Error('Failed to create deposit transaction')
    }

    console.log('Deposit transaction created successfully:', transaction.id)

    return new Response(
      JSON.stringify({
        success: true,
        transaction: {
          id: transaction.id,
          amount: netAmount,
          fee_amount: feeAmount,
          total_amount: amount,
          currency: currency,
          status: transaction.status,
          reference: transaction.reference
        },
        message: 'Deposit request submitted successfully and is pending approval'
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
    console.error('Error in process-deposit:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process deposit',
        success: false
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  }
}

Deno.serve(handler)