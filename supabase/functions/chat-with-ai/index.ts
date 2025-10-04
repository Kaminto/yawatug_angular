import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, systemContext } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Enhanced system context for PUBLIC users (not logged in)
    const enhancedSystemContext = `${systemContext}

CRITICAL: This is a PUBLIC VISITOR (not logged in). Focus on:
- Explaining how they can become LIFETIME OWNERS of Yawatu by buying shares
- Every share they buy makes them a permanent co-owner who earns dividends forever
- 5% referral commission on ALL purchases and bookings by people they refer
- Minimum investment: 10 shares at UGX 20,000 each = UGX 200,000 total
- Flexible payment: Full payment or installment plans (25% down payment, 30 days to complete)
- Payment methods: MTN Mobile Money, Airtel Money, M-Pesa, Bank Transfer
- No fixed share batches - buy anytime from our Dynamic Share Pool
- Wallet system: Manage funds in UGX and USD
- Booking system: Reserve shares with down payment, pay in installments
- Account types: Individual, Joint, Company, Minor accounts

LIFETIME OWNERSHIP MESSAGE:
When you invest in Yawatu, you don't just buy shares - you become a PERMANENT OWNER of Uganda's mineral wealth. Your shares represent real ownership in our mining operations, and you'll earn dividends for as long as the company operates. This is building generational wealth!

REFERRAL EMPHASIS:
The 5% commission on referrals is LIFETIME INCOME - every time someone you referred makes a purchase or booking, you earn. Build your network and create passive income streams!

Be enthusiastic, use emojis, focus on the opportunity, and encourage registration!`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: enhancedSystemContext
          },
          ...messages
        ],
        max_tokens: 800,
        temperature: 0.8,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to generate response');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ 
      response: aiResponse,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat-with-ai:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message,
      response: 'I apologize, but I\'m having trouble right now. Please try again or contact our support team for assistance!'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
