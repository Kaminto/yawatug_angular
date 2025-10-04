import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, message, agentId } = await req.json();
    
    if (!conversationId || !message || !agentId) {
      throw new Error('Missing required fields');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify agent is assigned to this conversation
    const { data: assignment } = await supabase
      .from('chat_assignments')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('assigned_to', agentId)
      .single();

    if (!assignment) {
      throw new Error('Agent not assigned to this conversation');
    }

    // If assignment is pending, mark as accepted
    if (assignment.status === 'pending') {
      await supabase
        .from('chat_assignments')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', assignment.id);
    }

    // Insert agent message
    const { data: newMessage, error: messageError } = await supabase
      .from('chatbot_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: message,
        message_type: 'human_agent',
        metadata: { agent_id: agentId }
      })
      .select()
      .single();

    if (messageError) {
      throw messageError;
    }

    // Update conversation last activity
    await supabase
      .from('chatbot_conversations')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    return new Response(
      JSON.stringify({ success: true, message: newMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
