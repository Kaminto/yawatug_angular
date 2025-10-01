import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerifyRecipientRequest {
  email?: string;
  phone?: string;
  currency?: string;
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

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid authorization')
    }

    const { email, phone, currency }: VerifyRecipientRequest = await req.json()

    if (!email && !phone) {
      throw new Error('Either email or phone is required')
    }

    if (!currency) {
      throw new Error('Currency is required for wallet verification')
    }

    console.log('Verifying recipient:', { email: email || '[hidden]', phone: phone || '[hidden]', currency })

    // Try RPC first, then fallback to direct queries to avoid type mismatch issues
    let recipients: any[] | null = null;
    let recipientError: any = null;
    try {
      const rpcRes = await supabase.rpc('verify_recipient_lookup_with_wallet', {
        p_email: email || null,
        p_phone: phone || null,
        p_currency: currency
      });
      recipients = rpcRes.data as any[] | null;
      recipientError = rpcRes.error || null;
    } catch (e) {
      recipientError = e;
    }

    if (recipientError) {
      console.error('RPC lookup failed, falling back to direct queries:', recipientError);
      // Fallback: direct profile lookup
      const { data: profileList, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, status')
        .or([
          email ? `email.eq.${(email || '').trim().toLowerCase()}` : '',
          phone ? `phone.eq.${(phone || '').trim()}` : ''
        ].filter(Boolean).join(','));

      if (profileError) {
        console.error('Profile lookup error:', profileError);
      }

      if (profileList && Array.isArray(profileList) && profileList.length > 0) {
        const p = profileList[0] as any;
        const { data: wallet } = await supabase
          .from('wallets')
          .select('id')
          .eq('user_id', p.id)
          .eq('currency', currency)
          .maybeSingle();

        const allowed = ['active', 'pending_verification', 'unverified'];
        const verified = allowed.includes(String(p.status || ''));

        recipients = [{
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          status: p.status,
          user_exists: true,
          verified,
          has_wallet: Boolean(wallet)
        }];
      } else {
        recipients = [];
      }
    }

    console.log('Database lookup result:', {
      found: Array.isArray(recipients) && recipients.length > 0,
      error: recipientError?.message
    });

    if (!recipients || recipients.length === 0) {
      console.log('No recipient found in database')
      return new Response(
        JSON.stringify({
          success: false,
          exists: false,
          verified: false,
          message: 'Recipient not found'
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

    const recipient = recipients[0]
    
    // Check if recipient exists and is verified
    if (!recipient.user_exists) {
      console.log('Recipient does not exist')
      return new Response(
        JSON.stringify({
          success: false,
          exists: false,
          verified: false,
          message: 'Recipient not found'
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

    if (!recipient.verified) {
      console.log('Recipient exists but is not verified:', recipient.status)
      return new Response(
        JSON.stringify({
          success: false,
          exists: true,
          verified: false,
          message: `Recipient account status is ${recipient.status}. Only active, unverified, or pending verification users can receive transfers.`,
          recipient: {
            id: recipient.id,
            full_name: recipient.full_name,
            email: recipient.email,
            status: recipient.status
          }
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

    // Check if recipient has a wallet for the currency
    if (!recipient.has_wallet) {
      console.log('Recipient exists but has no wallet for currency')
      return new Response(
        JSON.stringify({
          success: false,
          exists: true,
          verified: false,
          message: 'Recipient does not have a wallet to receive transfers. They need to set up their account first.',
          recipient: {
            id: recipient.id,
            full_name: recipient.full_name,
            email: recipient.email,
            status: recipient.status
          }
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

    console.log('Recipient successfully verified:', recipient.status)
    return new Response(
      JSON.stringify({
        success: true,
        exists: true,
        verified: true,
        message: 'Recipient verified successfully',
        recipient: {
          id: recipient.id,
          full_name: recipient.full_name,
          email: recipient.email,
          status: recipient.status
        }
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
    console.error('Error in verify-recipient:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to verify recipient',
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