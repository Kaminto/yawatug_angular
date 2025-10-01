import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { automated, manual_test } = await req.json().catch(() => ({}));
    
    console.log('🚀 Triggering auto pricing scheduler...', { automated, manual_test });

    // Log cron execution if automated
    if (automated) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      // Log the execution
      await supabaseClient.rpc('log_cron_execution');
    }

    // Call the main auto-price-scheduler function using Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: result, error } = await supabaseClient.functions.invoke('auto-price-scheduler', {
      body: { 
        triggered_by: automated ? 'cron' : 'manual',
        test_mode: manual_test || false 
      }
    });

    if (error) {
      console.error('❌ Error calling auto-price-scheduler:', error);
      throw error;
    }

    console.log('✅ Auto pricing scheduler triggered successfully:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Auto pricing scheduler triggered',
        result: result,
        triggered_by: automated ? 'cron' : 'manual',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error triggering auto pricing:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});