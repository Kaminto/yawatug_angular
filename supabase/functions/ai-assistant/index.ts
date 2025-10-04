import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context, userId, userRole, conversationHistory, visitorContext } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client for data queries
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Enhanced system context with current data
    const enhancedContext = await buildEnhancedContext(supabase, context, userId, userRole, visitorContext);

    // Build conversation history for OpenAI
    const messages = [
      {
        role: 'system',
        content: enhancedContext
      },
      // Include conversation history for context
      ...(conversationHistory || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to generate response');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Log the conversation for analytics
    if (userId) {
      await logConversation(supabase, userId, message, aiResponse, userRole);
    }

    return new Response(JSON.stringify({ 
      response: aiResponse,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI assistant:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message,
      response: 'I apologize, but I\'m experiencing technical difficulties. Please try again later or contact support if the issue persists.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function buildEnhancedContext(supabase: any, baseContext: string, userId: string, userRole: string, visitorContext?: any) {
  try {
    let dataContext = '';

    if (userRole === 'admin') {
      // Get admin-specific data
      const [usersCount, pendingVerifications, todayTransactions, activeVotings, systemHealth] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('status', 'pending_verification'),
        supabase.from('transactions').select('amount, transaction_type').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('voting_proposals').select('id', { count: 'exact' }).eq('status', 'active'),
        supabase.from('admin_sub_wallets').select('balance, currency, wallet_type')
      ]);

      const totalTransactionVolume = todayTransactions.data?.reduce((sum: number, tx: any) => sum + Math.abs(tx.amount || 0), 0) || 0;

      dataContext = `Current System Data:
- Total Users: ${usersCount.count || 0}
- Pending Verifications: ${pendingVerifications.count || 0}
- Today's Transactions: ${todayTransactions.count || 0} (Volume: UGX ${totalTransactionVolume.toLocaleString()})
- Active Voting Proposals: ${activeVotings.count || 0}
- Admin Wallets Available: ${systemHealth.data?.length || 0}

Admin Commands Available:
- "show pending verifications" - List users needing verification
- "system health status" - Check overall system performance
- "today's transaction volume" - Show transaction analytics
- "active voting proposals" - List ongoing votes
- "user stats" - Show user growth and engagement metrics
`;

    } else if (userId) {
      // Get user-specific data
      const [userProfile, userWallet, userShares, recentTransactions] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('wallets').select('*').eq('user_id', userId).single(),
        supabase.from('user_shares').select('*, shares(*)').eq('user_id', userId),
        supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5)
      ]);

      const totalSharesCount = userShares.data?.reduce((sum: number, us: any) => sum + (us.quantity || 0), 0) || 0;
      const estimatedShareValue = totalSharesCount * 20000; // Current share price UGX 20,000

      dataContext = `User Account Data (LIFETIME OWNER):
- Profile Status: ${userProfile.data?.status || 'unknown'}
- Account Type: ${userProfile.data?.account_type || 'standard'}
- Verification Status: ${userProfile.data?.profile_completion_percentage || 0}% complete
- Wallet Balance: UGX ${userWallet.data?.balance?.toLocaleString() || '0'}
- Total Shares Owned: ${totalSharesCount} shares (Est. value: UGX ${estimatedShareValue.toLocaleString()})
- Share Holdings: ${userShares.data?.length || 0} different share types
- Recent Transactions: ${recentTransactions.data?.length || 0}

💎 OWNERSHIP STATUS: This user is a LIFETIME CO-OWNER of Yawatu! They earn dividends forever.

Available Actions:
- "check my balance" - Show current wallet balance and share value
- "my shares" - View all share holdings and estimated value
- "referral earnings" - Check 5% lifetime commission from referrals
- "buy more shares" - Purchase additional shares from Dynamic Share Pool
- "account verification" - Complete verification for full access
- "recent transactions" - Show transaction history
- "dividend history" - View lifetime dividend earnings
`;
    }

    // Add first-time visitor context
    let visitorSpecificContext = '';
    if (visitorContext?.isFirstTime && !userId) {
      // Fetch active promotions for first-time visitors
      const { data: promotions } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .or('target_audience.eq.all,target_audience.eq.first_time')
        .order('priority', { ascending: false })
        .limit(3);

      const promotionText = promotions?.length > 0 
        ? promotions.map((p: any) => `• ${p.title}: ${p.description}`).join('\n')
        : '• 15% Welcome bonus on first investment\n• Fast-track verification\n• Free investment consultation';

      visitorSpecificContext = `

🎯 CRITICAL: FIRST-TIME VISITOR DETECTED!

This user is visiting Yawatu for the FIRST TIME and has exclusive access to special offers:

CURRENT ACTIVE PROMOTIONS:
${promotionText}

SPECIAL MESSAGING INSTRUCTIONS:
- Use welcoming, enthusiastic tone with emojis
- Present the CURRENT ACTIVE PROMOTIONS listed above
- Create urgency for limited-time offers
- Guide towards registration to claim benefits
- Make them feel special and valued as new visitor
- Use words like "exclusive", "limited time", "special", "bonus"
- Include clear call-to-action buttons in responses
- Focus on the unique opportunity they have RIGHT NOW

Remember: This is their FIRST impression - make it count! They should feel excited about the exclusive opportunities available only to them as a new visitor.`;
    }

    return `${baseContext}

${dataContext}${visitorSpecificContext}

Important Guidelines:
1. Always be helpful, accurate, and professional
2. For sensitive operations, suggest users contact support or visit the appropriate admin panel
3. Provide step-by-step guidance when possible
4. If you don't have specific data, indicate this clearly
5. Keep responses concise but comprehensive
6. For admin users: Focus on operational efficiency and system oversight
7. For regular users: Focus on account management and platform navigation
${visitorContext?.isFirstTime ? '8. FOR FIRST-TIME VISITORS: Prioritize current active promotions, create excitement, use emojis, emphasize exclusivity!' : ''}

Current timestamp: ${new Date().toISOString()}`;

  } catch (error) {
    console.error('Error building enhanced context:', error);
    return baseContext;
  }
}

async function logConversation(supabase: any, userId: string, userMessage: string, aiResponse: string, userRole: string) {
  try {
    await supabase.from('ai_conversation_logs').insert({
      user_id: userId,
      user_message: userMessage,
      ai_response: aiResponse,
      user_role: userRole,
      session_id: `${userId}-${Date.now()}`, // Simple session tracking
      metadata: {
        timestamp: new Date().toISOString(),
        model: 'gpt-4.1-2025-04-14',
        context_type: userRole === 'admin' ? 'admin_assistance' : 'user_support'
      }
    });
  } catch (error) {
    console.error('Error logging conversation:', error);
  }
}