import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

console.log('SMS Sender initializing...', new Date().toISOString())

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SMSRequest {
  phoneNumber: string
  message: string
  purpose?: string
  userId?: string
}

const handler = async (req: Request): Promise<Response> => {
  console.log('SMS function called:', req.method, new Date().toISOString())
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Check SMS credentials - try multiple possible names
    const smsUsername = Deno.env.get('SMS_USERNAME') || Deno.env.get('SMS_USER') || Deno.env.get('EASYUGANDA_USER')
    const smsPassword = Deno.env.get('SMS_PASSWORD') || Deno.env.get('EASYUGANDA_PASSWORD')  
    const smsSender = Deno.env.get('SMS_SENDER') || Deno.env.get('EASYUGANDA_SENDER')
    
    console.log('SMS credentials check:', {
      username: !!smsUsername,
      password: !!smsPassword, 
      sender: !!smsSender
    })
    
    if (!smsUsername || !smsPassword) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing SMS credentials. Please configure SMS_USERNAME/SMS_PASSWORD or EASYUGANDA_USER/EASYUGANDA_PASSWORD in Supabase secrets.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { phoneNumber, message, purpose, userId }: SMSRequest = await req.json()
    
    // Format phone number consistently (remove + and ensure Uganda format)
    let cleanPhone = phoneNumber.replace(/\D/g, ''); // Remove all non-digits
    if (cleanPhone.length === 9 && cleanPhone.startsWith('7')) {
      cleanPhone = '256' + cleanPhone;
    } else if (cleanPhone.length === 10 && cleanPhone.startsWith('07')) {
      cleanPhone = '256' + cleanPhone.substring(1);
    } else if (cleanPhone.length === 12 && cleanPhone.startsWith('256')) {
      // Already in correct format
    } else if (cleanPhone.startsWith('256')) {
      // Handle cases where it might be missing leading digits
      cleanPhone = cleanPhone;
    }
    
    // Format for SMS API (needs +256 prefix)
    let formattedPhone = '+' + cleanPhone;
    
    console.log('SMS request received:', { phoneNumber, cleanPhone, formattedPhone, purpose, userId });

    console.log('Attempting to send SMS via EasyUganda to:', formattedPhone)
    
    // Send SMS via EasyUganda API using form data
    const formData = new URLSearchParams()
    formData.append('user', smsUsername)
    formData.append('password', smsPassword)
    formData.append('sender', smsSender || 'YAWATU')
    formData.append('reciever', formattedPhone)
    formData.append('message', message)

    const smsResponse = await fetch('http://sms.easyuganda.net/api-sub.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    })

    const responseText = await smsResponse.text()
    console.log('EasyUganda SMS response:', responseText)
    
    if (!smsResponse.ok || responseText.includes('Invalid')) {
      throw new Error(`SMS API error: ${responseText}`)
    }

    console.log('SMS sent successfully')
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'SMS sent successfully',
        result: responseText
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('SMS function error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to send SMS',
        details: (error as any)?.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

console.log('SMS Sender ready to serve requests')
serve(handler)