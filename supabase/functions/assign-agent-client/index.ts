import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AssignAgentRequest {
  user_id: string;
  agent_code?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { user_id, agent_code }: AssignAgentRequest = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    let agent_id: string | null = null;

    // If agent code provided, find the agent
    if (agent_code) {
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('id')
        .eq('agent_code', agent_code)
        .eq('status', 'active')
        .maybeSingle();

      if (agentError) {
        console.error('Error finding agent:', agentError);
        return new Response(
          JSON.stringify({ error: 'Failed to find agent' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      agent_id = agent?.id || null;
    }

    // Check if user is already assigned to an agent
    const { data: existingAssignment } = await supabase
      .from('agent_clients')
      .select('id')
      .eq('client_id', user_id)
      .maybeSingle();

    if (existingAssignment) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'User already assigned to an agent',
          existing: true
        }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // If no agent found and no code provided, try to auto-assign to available agent
    if (!agent_id) {
      // Get agent with least clients
      const { data: availableAgent, error: autoAssignError } = await supabase
        .from('agents')
        .select(`
          id,
          total_clients
        `)
        .eq('status', 'active')
        .order('total_clients', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (autoAssignError) {
        console.error('Error auto-assigning agent:', autoAssignError);
      } else if (availableAgent) {
        agent_id = availableAgent.id;
      }
    }

    // If we have an agent, create the assignment
    if (agent_id) {
      const { error: assignError } = await supabase
        .from('agent_clients')
        .insert({
          agent_id,
          client_id: user_id,
          status: 'active',
          onboarded_at: new Date().toISOString()
        });

      if (assignError) {
        console.error('Error assigning client to agent:', assignError);
        return new Response(
          JSON.stringify({ error: 'Failed to assign client to agent' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Update agent client count
      const { error: updateError } = await supabase
        .from('agents')
        .update({ 
          total_clients: await getAgentClientCount(supabase, agent_id),
          updated_at: new Date().toISOString()
        })
        .eq('id', agent_id);

      if (updateError) {
        console.error('Error updating agent stats:', updateError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Client successfully assigned to agent',
          agent_id
        }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'No agent assignment needed',
        agent_id: null
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error('Error in assign-agent-client function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

async function getAgentClientCount(supabase: any, agentId: string): Promise<number> {
  const { count } = await supabase
    .from('agent_clients')
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', agentId)
    .eq('status', 'active');
  
  return count || 0;
}

serve(handler);