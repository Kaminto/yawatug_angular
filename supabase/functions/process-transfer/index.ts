import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TransferRequest {
  amount: number;
  currency: string;
  recipientIdentifier: string; // email or phone
  purpose?: string;
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

    const body = await req.json()
    console.log('Processing transfer request:', { amount: body.amount, currency: body.currency, recipient: body.recipientIdentifier })
    
    const { amount, currency, recipientIdentifier }: TransferRequest = body

    if (!amount || amount <= 0) {
      throw new Error('Valid amount is required')
    }

    if (!currency || !['UGX', 'USD'].includes(currency)) {
      throw new Error('Valid currency (UGX or USD) is required')
    }

    if (!recipientIdentifier) {
      throw new Error('Recipient email or phone is required')
    }

    // Get sender's wallet
    const { data: senderWallet, error: senderWalletError } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', user.id)
      .eq('currency', currency)
      .single()

    if (senderWalletError || !senderWallet) {
      throw new Error(`${currency} wallet not found`)
    }

    // Simple fee calculation - 1% or minimum 1000 UGX
    const feeAmount = Math.max(amount * 0.01, currency === 'UGX' ? 1000 : 1)
    const totalDeduction = amount + feeAmount

    if (senderWallet.balance < totalDeduction) {
      throw new Error(`Insufficient balance. Required: ${totalDeduction} ${currency}, Available: ${senderWallet.balance} ${currency}`)
    }

    // Find recipient by email or phone
    const isEmail = recipientIdentifier.includes('@')
    const { data: recipientProfile, error: recipientError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq(isEmail ? 'email' : 'phone', recipientIdentifier)
      .single()

    if (recipientError || !recipientProfile) {
      throw new Error('Recipient not found')
    }

    console.log('Found recipient:', recipientProfile.full_name)

    // Get or create recipient wallet
    let { data: recipientWallet, error: recipientWalletError } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', recipientProfile.id)
      .eq('currency', currency)
      .single()

    if (recipientWalletError) {
      // Create recipient wallet if it doesn't exist
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({
          user_id: recipientProfile.id,
          currency: currency,
          balance: 0,
          status: 'active'
        })
        .select('id, balance')
        .single()

      if (createError) {
        throw new Error('Failed to create recipient wallet')
      }
      recipientWallet = newWallet
      console.log('Created new wallet for recipient')
    }

    console.log('Starting transfer transaction...')

    // Execute transfer using database transaction for atomicity
    if (!recipientWallet) {
      throw new Error('Recipient wallet not found');
    }
    
    const reference = `TRF-${Date.now()}-${user.id.slice(0, 8)}`
    
    try {
      // Use a database transaction to ensure atomicity
      const { data: transactionResult, error: transactionError } = await supabase.rpc('process_wallet_transfer', {
        p_sender_wallet_id: senderWallet.id,
        p_recipient_wallet_id: recipientWallet.id,
        p_sender_user_id: user.id,
        p_recipient_user_id: recipientProfile.id,
        p_amount: amount,
        p_fee_amount: feeAmount,
        p_currency: currency,
        p_reference: reference,
        p_recipient_name: recipientProfile.full_name,
        p_recipient_identifier: recipientIdentifier
      })

      if (transactionError) {
        console.error('Database transaction failed:', transactionError)
        throw new Error(`Transfer failed: ${transactionError.message}`)
      }

      console.log('Database transaction completed successfully:', transactionResult)
      
    } catch (dbError) {
      console.error('Database transaction error:', dbError)
      
      // If we have a database function error, fall back to manual transaction with proper rollback
      console.log('Falling back to manual transaction processing...')
      
      // Step 1: Deduct from sender
      const { error: deductError } = await supabase
        .from('wallets')
        .update({ balance: senderWallet.balance - totalDeduction })
        .eq('id', senderWallet.id)

      if (deductError) {
        console.error('Failed to deduct from sender:', deductError)
        throw new Error('Failed to deduct from sender wallet')
      }

      let senderDeducted = true

      try {
        // Step 2: Add to recipient
        const { error: creditError } = await supabase
          .from('wallets')
          .update({ balance: recipientWallet.balance + amount })
          .eq('id', recipientWallet.id)

        if (creditError) {
          console.error('Failed to credit recipient:', creditError)
          throw new Error('Failed to credit recipient wallet')
        }

        // Step 3: Create transaction records
        const transactionData = {
          currency: currency,
          reference: reference,
          status: 'completed',
          approval_status: 'completed',
          created_at: new Date().toISOString()
        }

        // Create sender transaction record
        const { error: senderTxError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            wallet_id: senderWallet.id,
            transaction_type: 'transfer',
            amount: -totalDeduction,
            admin_notes: `Transfer to ${recipientProfile.full_name} (${recipientIdentifier}). Fee: ${feeAmount} ${currency}`,
            ...transactionData
          })

        if (senderTxError) {
          console.error('Failed to create sender transaction record:', senderTxError)
          throw new Error('Failed to create sender transaction record')
        }

        // Create recipient transaction record
        const { error: recipientTxError } = await supabase
          .from('transactions')
          .insert({
            user_id: recipientProfile.id,
            wallet_id: recipientWallet.id,
            transaction_type: 'transfer',
            amount: amount,
            admin_notes: `Transfer received from user`,
            ...transactionData
          })

        if (recipientTxError) {
          console.error('Failed to create recipient transaction record:', recipientTxError)
          throw new Error('Failed to create recipient transaction record')
        }

      } catch (error) {
        // Rollback: Restore sender balance if any step failed
        if (senderDeducted) {
          console.log('Rolling back sender wallet deduction...')
          await supabase
            .from('wallets')
            .update({ balance: senderWallet.balance })
            .eq('id', senderWallet.id)
        }
        throw error
      }
    }

    console.log('Transfer completed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        transaction: {
          amount: amount,
          fee_amount: feeAmount,
          total_amount: totalDeduction,
          currency: currency,
          reference: reference,
          recipient: {
            name: recipientProfile.full_name,
            identifier: recipientIdentifier
          }
        },
        message: 'Transfer completed successfully'
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
    console.error('Transfer failed:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Transfer failed',
        success: false
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  }
}

Deno.serve(handler)