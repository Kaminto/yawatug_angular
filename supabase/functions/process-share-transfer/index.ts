import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      share_transfer_requests: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          share_id: string
          quantity: number
          share_price: number
          transfer_value: number
          transfer_fee: number
          status: string
          reason: string | null
          auto_approved: boolean
          admin_notes: string | null
          created_at: string
          approved_at: string | null
          completed_at: string | null
          processed_by: string | null
          sender_balance_before: number | null
          sender_balance_after: number | null
          recipient_balance_before: number | null
          recipient_balance_after: number | null
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_id: string
          share_id: string
          quantity: number
          share_price: number
          transfer_value: number
          transfer_fee: number
          status?: string
          reason?: string | null
          auto_approved?: boolean
          admin_notes?: string | null
          created_at?: string
          approved_at?: string | null
          completed_at?: string | null
          processed_by?: string | null
          sender_balance_before?: number | null
          sender_balance_after?: number | null
          recipient_balance_before?: number | null
          recipient_balance_after?: number | null
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_id?: string
          share_id?: string
          quantity?: number
          share_price?: number
          transfer_value?: number
          transfer_fee?: number
          status?: string
          reason?: string | null
          auto_approved?: boolean
          admin_notes?: string | null
          created_at?: string
          approved_at?: string | null
          completed_at?: string | null
          processed_by?: string | null
          sender_balance_before?: number | null
          sender_balance_after?: number | null
          recipient_balance_before?: number | null
          recipient_balance_after?: number | null
        }
      }
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { transferId } = await req.json()

    if (!transferId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Transfer ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing share transfer:', transferId)

    // Call database function directly to handle everything
    const { data: processResult, error: processError } = await supabase
      .rpc('admin_approve_and_process_transfer' as any, { 
        p_transfer_id: transferId,
        p_admin_id: null
      } as any)

    if (processError) {
      console.error('Process transfer error:', processError)
      return new Response(
        JSON.stringify({ success: false, error: processError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Transfer processed successfully:', processResult)

    return new Response(
      JSON.stringify(processResult),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})