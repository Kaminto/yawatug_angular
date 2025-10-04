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
    const { message, conversationHistory, forwardToHuman, sessionId, userId, menuAction } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY is not configured');
      throw new Error('AI service is not configured');
    }
    
    // If forwarding to human, return a response indicating transfer
    // Get or create conversation
    let conversationId = sessionId;
    if (sessionId && supabase) {
      const { data: existingConv } = await supabase
        .from('chatbot_conversations')
        .select('id')
        .eq('session_id', sessionId)
        .single();
      
      if (!existingConv) {
        const { data: newConv } = await supabase
          .from('chatbot_conversations')
          .insert({
            session_id: sessionId,
            user_id: userId || null,
            visitor_identifier: userId ? null : sessionId,
          })
          .select('id')
          .single();
        
        conversationId = newConv?.id;
      } else {
        conversationId = existingConv.id;
      }
    }

    // If forwarding to human, mark conversation and try auto-assignment
    if (forwardToHuman) {
      if (conversationId && supabase) {
        // Mark as escalated
        await supabase
          .from('chatbot_conversations')
          .update({
            escalated_to_human: true,
            escalation_reason: 'User requested human support',
          })
          .eq('id', conversationId);
        
        // Try auto-assigning to available agent
        try {
          const { data: assignedAgent } = await supabase.rpc('auto_assign_chat_to_agent', {
            p_conversation_id: conversationId
          });
          
          if (assignedAgent) {
            console.log('Chat auto-assigned to agent:', assignedAgent);
          } else {
            console.log('No available agents - chat queued for manual assignment');
          }
        } catch (err) {
          console.error('Auto-assignment failed:', err);
        }
      }
      
      return new Response(
        JSON.stringify({ 
          response: "I'm connecting you with a human assistant. An agent will be with you shortly. Please wait for their response." 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Log user message
    if (conversationId && supabase) {
      await supabase.from('chatbot_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: message,
        message_type: menuAction ? 'menu_action' : 'text',
        metadata: menuAction ? { action: menuAction } : {},
      });
      
      // Update conversation message count
      try {
        await supabase
          .from('chatbot_conversations')
          .update({ total_messages: (conversationHistory?.length || 0) + 1 })
          .eq('id', conversationId);
      } catch (err) {
        console.error('Failed to update message count:', err);
      }
    }

    // Enhanced system context with comprehensive Yawatu information
    const systemContext = `You are Yawatu AI Assistant - a friendly, knowledgeable virtual agent for Yawatu Minerals & Mining PLC.

CORE IDENTITY:
- Be warm, professional, and enthusiastic about lifetime ownership
- Keep responses clear and concise (2-3 paragraphs max)
- Use emojis sparingly for warmth
- Always encourage users to take the next step (register, complete KYC, buy shares)

ABOUT YAWATU:
Company: Yawatu Minerals & Mining PLC - Uganda's premier mining investment platform
Share Price: UGX 20,000 per share
Investment Model: LIFETIME OWNERSHIP - own shares forever, earn dividends as long as company operates

KEY FEATURES:
✓ Dynamic Share Pool - shares available anytime, no waiting for batches
✓ Lifetime dividends from mining profits
✓ 5% referral commission on every referral's purchase (lifetime passive income)
✓ Multi-currency wallets (UGX/USD)
✓ Flexible payment: Mobile Money (MTN, Airtel), Bank Transfer, M-Pesa
✓ Share bookings: 25% down payment, 30 days to complete
✓ Shareholder voting rights
✓ Capital gains through P2P share trading
✓ Agent network for in-person support

INVESTMENT PROCESS:
1. Sign Up → Create free account at yawatu.com
2. KYC Verification → Upload ID and complete profile (required for security)
3. Fund Wallet → Deposit via Mobile Money/Bank Transfer
4. Buy Shares → Select quantity and confirm purchase
5. Receive Certificates → Digital share certificates issued instantly
6. Earn Dividends → Automatic dividend distributions

WALLET FEATURES:
- Multi-currency support (UGX, USD)
- Deposit via Mobile Money, Bank Transfer
- Withdraw to your mobile money or bank account
- Transfer between users
- View transaction history
- Real-time balance updates

REFERRAL PROGRAM:
- Share your unique referral code
- Earn 5% commission on every referral's share purchase
- Lifetime passive income stream
- Track referrals and earnings in dashboard
- Withdraw commissions anytime

KYC REQUIREMENTS:
- Valid government-issued ID (National ID, Passport, Driving License)
- Clear photo/selfie
- Proof of address (utility bill, bank statement)
- Phone number verification
- Processing time: 24-48 hours

AGENT PROGRAM:
- Become a Yawatu agent and earn commissions
- Help clients buy shares in-person
- Earn from transaction fees and share commissions
- Training and support provided
- Apply through the app

SECURITY & SUPPORT:
- Bank-level encryption
- Secure authentication
- Customer support: support@yawatu.com
- Live chat available 8AM-8PM EAT
- WhatsApp: +256-XXX-XXXXXX

WHEN USERS ASK ABOUT:
- Buying shares → Guide them to register → complete KYC → fund wallet → buy shares
- Wallet issues → Explain deposit/withdrawal process, suggest checking transaction status
- KYC status → Tell them to check profile completion percentage, upload required documents
- Referrals → Explain 5% commission structure, show them how to share referral code
- Agent program → Explain benefits, guide them to agent application section
- Technical issues → Offer to escalate to human support

CONVERSATION GUIDELINES:
- If user seems confused, break down steps simply
- If they ask about pricing, emphasize lifetime ownership value
- If they're hesitant, highlight referral income potential
- If they have complaints, show empathy and offer to connect them with support
- Always end with a clear call-to-action

Remember: Your goal is to help visitors become lifetime Yawatu shareholders and build wealth through mining investments!`;

    // Build conversation history
    const messages = [
      { role: 'system', content: systemContext },
      ...(conversationHistory || []).map((msg: any) => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.8,
        max_tokens: 800
      }),
    });

    if (!response.ok) {
      let errText = await response.text();
      let msg = 'Failed to get AI response';
      try {
        const errJson = JSON.parse(errText);
        msg = errJson.error?.message || msg;
      } catch (_) { /* ignore parse errors */ }
      console.error('OpenAI API error:', response.status, errText);
      return new Response(
        JSON.stringify({ error: msg, response: msg }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "I apologize, but I'm having trouble processing your request right now. Please try again.";

    // Log AI response
    if (conversationId && supabase) {
      await supabase.from('chatbot_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: aiResponse,
        message_type: 'text',
      });
    }

    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

    } catch (error) {
      console.error('Error:', error);
      
      // Auto-escalate to human on AI failure
      if (conversationId && supabase) {
        try {
          await supabase
            .from('chatbot_conversations')
            .update({
              escalated_to_human: true,
              escalation_reason: 'AI service failure - auto-escalated',
            })
            .eq('id', conversationId);
          
          // Try auto-assigning to available agent
          const { data: assignedAgent } = await supabase.rpc('auto_assign_chat_to_agent', {
            p_conversation_id: conversationId
          });
          
          if (assignedAgent) {
            console.log('Chat auto-assigned to agent due to AI failure');
          }
        } catch (escalationError) {
          console.error('Auto-escalation failed:', escalationError);
        }
      }
      
      return new Response(
        JSON.stringify({ 
          error: error instanceof Error ? error.message : 'Unknown error',
          response: "I'm having trouble right now. I've notified our human agents who will respond shortly. Please wait a moment."
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
});
