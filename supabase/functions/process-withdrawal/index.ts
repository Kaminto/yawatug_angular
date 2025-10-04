import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    // Use SimpleLes Gateway for withdrawal processing
    console.log('Processing withdrawal via SimpleLes Gateway:', { phoneNumber: msisdn, amount, currency })
    
    try {
      // Call the simpleles-gateway function
      const gatewayResponse = await supabase.functions.invoke('simpleles-gateway', {
        body: {
          operation: 'withdraw',
          amount,
          currency,
          phoneNumber: msisdn,
          reference: transaction.reference,
          description: description || 'Withdrawal request',
          transactionId: transaction.id
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      console.log('SimpleLes Gateway response:', gatewayResponse)

      if (gatewayResponse.error) {
        throw new Error(gatewayResponse.error.message || 'Gateway request failed')
      }

      const gatewayData = gatewayResponse.data

      if (gatewayData?.success) {
        // Gateway and SimpleLes both succeeded
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
        // Gateway call succeeded but SimpleLes reported failure
        const errorMessage = gatewayData?.data?.message || 'Failed to process withdrawal with mobile money provider'
        console.error('SimpleLes API error:', gatewayData)
        
        throw new Error(errorMessage)
      }
    } catch (apiError: any) {
      console.error('Error calling SimpleLes Gateway:', apiError)
      
      // Update transaction to failed
      await supabase
        .from('transactions')
        .update({ 
          status: 'failed',
          admin_notes: apiError.message
        })
        .eq('id', transaction.id)

      throw new Error('Failed to process withdrawal: ' + apiError.message)
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