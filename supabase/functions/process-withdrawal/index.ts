import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// SimpleLes API Configuration
const SIMPLELES_WITHDRAW_URL = "http://payments.simpleles.net:5056/api/wallet/mm-withdraw";
const SIMPLELES_BALANCE_URL = "http://payments.simpleles.net:5056/api/wallet/mm-balance";
const SIMPLELES_API_KEY = "YW.dByWxeGfQHqVV6309MHtJQ-dId9UPVsR-TIop7RuYrmA9RIL";
const SIMPLELES_ACCOUNT_NO = "YEW2024A25E4R";

interface WithdrawalRequest {
  amount: number;
  currency: string;
  withdrawalMethod: string;
  description?: string;
  phoneNumber?: string;
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

    const { amount, currency, withdrawalMethod, description, phoneNumber }: WithdrawalRequest = await req.json()

    if (!amount || amount <= 0) {
      throw new Error('Valid amount is required')
    }

    if (!currency) {
      throw new Error('Currency is required')
    }

    console.log('Processing withdrawal for user:', user.id, { amount, currency, withdrawalMethod })

    // Get user's wallet for the specified currency
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', user.id)
      .eq('currency', currency)
      .single()

    if (walletError || !wallet) {
      throw new Error(`${currency} wallet not found for user`)
    }

    if (wallet.balance < amount) {
      throw new Error(`Insufficient balance. Available: ${wallet.balance} ${currency}`)
    }

    // Get fee settings for withdrawal
    const { data: feeSettings } = await supabase
      .from('transaction_fee_settings')
      .select('*')
      .eq('transaction_type', 'withdrawal')
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

    const totalDeduction = amount + feeAmount

    if (wallet.balance < totalDeduction) {
      throw new Error(`Insufficient balance including fees. Required: ${totalDeduction} ${currency}, Available: ${wallet.balance} ${currency}`)
    }

    // Create pending withdrawal transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        wallet_id: wallet.id,
        transaction_type: 'withdrawal',
        amount: -amount, // Negative for withdrawal
        currency: currency,
        status: 'pending',
        approval_status: 'pending',
        description: description || 'Withdrawal request',
        fee_amount: feeAmount,
        fee_percentage: feeSettings?.percentage_fee || 0,
        flat_fee: feeSettings?.flat_fee || 0,
        reference: `WD-${Date.now()}-${user.id.slice(0, 8)}`,
        metadata: {
          withdrawal_method: withdrawalMethod
        }
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Transaction creation error:', transactionError)
      throw new Error('Failed to create withdrawal transaction')
    }

    console.log('Withdrawal transaction created successfully:', transaction.id)

    // Get user's phone number from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', user.id)
      .maybeSingle()

    const msisdn = phoneNumber || profile?.phone

    if (!msisdn) {
      console.error('No phone number found for withdrawal')
      // Update transaction to failed
      await supabase
        .from('transactions')
        .update({ status: 'failed', admin_notes: 'No phone number found' })
        .eq('id', transaction.id)
      
      throw new Error('Phone number required for mobile money withdrawal')
    }

    // First, check SimpleLes wallet balance
    console.log('Checking SimpleLes wallet balance before withdrawal...')
    
    try {
      const balanceResponse = await fetch(`${SIMPLELES_BALANCE_URL}?account_no=${SIMPLELES_ACCOUNT_NO}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SIMPLELES_API_KEY}`
        }
      })

      const balanceData = await balanceResponse.json()
      console.log('SimpleLes Balance Check Response:', {
        status: balanceResponse.status,
        data: balanceData
      })

      // Log available balance for debugging
      if (balanceData && balanceData.balance !== undefined) {
        console.log(`SimpleLes Available Balance: ${balanceData.balance} ${currency}`)
        console.log(`Withdrawal Amount: ${amount} ${currency}`)
        
        if (parseFloat(balanceData.balance) < amount) {
          console.error(`Insufficient SimpleLes balance: ${balanceData.balance} < ${amount}`)
          
          // Update transaction to failed
          await supabase
            .from('transactions')
            .update({ 
              status: 'failed',
              admin_notes: `Insufficient SimpleLes wallet balance. Available: ${balanceData.balance}, Required: ${amount}`
            })
            .eq('id', transaction.id)
          
          // Return a 200 with structured error so the client doesn't see a generic non-2xx
          return new Response(
            JSON.stringify({
              success: false,
              code: 'provider_insufficient_balance',
              message: 'Payment provider has insufficient balance. Please contact support.',
              providerBalance: balanceData.balance,
              requestedAmount: amount,
              currency
            }),
            { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          )
        }
      }
    } catch (balanceError: any) {
      console.error('Error checking SimpleLes balance:', balanceError)
      // Continue with withdrawal attempt even if balance check fails
      console.log('Proceeding with withdrawal despite balance check error...')
    }

    // Call SimpleLes API to process the withdrawal
    console.log('Calling SimpleLes API for withdrawal:', { phoneNumber: msisdn, amount, currency })
    
    const simplesPayload = {
      account_no: SIMPLELES_ACCOUNT_NO,
      reference: transaction.reference,
      msisdn: msisdn,
      currency: currency,
      amount: amount.toString(),
      description: description || 'Withdrawal request'
    }

    try {
      const simplesResponse = await fetch(SIMPLELES_WITHDRAW_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SIMPLELES_API_KEY}`
        },
        body: JSON.stringify(simplesPayload)
      })

      const simplesData = await simplesResponse.json()
      console.log('SimpleLes API response:', simplesData)

      if (simplesResponse.ok && simplesData.status === 'success') {
        // Update transaction to processing/completed
        await supabase
          .from('transactions')
          .update({ 
            status: 'processing',
            gateway_reference: simplesData.reference || simplesData.transaction_id,
            metadata: { ...transaction.metadata, simples_response: simplesData }
          })
          .eq('id', transaction.id)

        return new Response(
          JSON.stringify({
            success: true,
            transaction: {
              id: transaction.id,
              amount: amount,
              fee_amount: feeAmount,
              total_amount: totalDeduction,
              currency: currency,
              status: 'processing',
              reference: transaction.reference
            },
            message: 'Withdrawal initiated successfully. Please check your phone for confirmation.'
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        )
      } else {
        // SimpleLes API failed
        console.error('SimpleLes API error:', simplesData)
        await supabase
          .from('transactions')
          .update({ 
            status: 'failed',
            admin_notes: JSON.stringify(simplesData)
          })
          .eq('id', transaction.id)

        throw new Error(simplesData.message || 'Failed to process withdrawal with mobile money provider')
      }
    } catch (apiError: any) {
      console.error('Error calling SimpleLes API:', apiError)
      
      // Update transaction to failed
      await supabase
        .from('transactions')
        .update({ 
          status: 'failed',
          admin_notes: apiError.message
        })
        .eq('id', transaction.id)

      throw new Error('Failed to connect to mobile money provider: ' + apiError.message)
    }

  } catch (error: any) {
    console.error('Error in process-withdrawal:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        code: 'withdrawal_error',
        message: error.message || 'Failed to process withdrawal'
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