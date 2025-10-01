import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    console.error('OpenAI API key not configured');
    socket.close(1011, 'API key not configured');
    return response;
  }

  console.log('🔌 WebSocket connection established, connecting to OpenAI Realtime API...');
  
  let openAISocket: WebSocket | null = null;

  try {
    // Connect to OpenAI Realtime API
    openAISocket = new WebSocket(
      "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
      {
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "OpenAI-Beta": "realtime=v1"
        }
      }
    );

    let sessionConfigured = false;

    openAISocket.onopen = () => {
      console.log('✅ Connected to OpenAI Realtime API');
    };

    openAISocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 OpenAI message:', data.type);

        // Configure session after connection
        if (data.type === 'session.created' && !sessionConfigured) {
          sessionConfigured = true;
          console.log('🔧 Configuring session...');
          
          const sessionConfig = {
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: `You are Yawatu AI Assistant, a helpful and knowledgeable assistant for the Yawatu Minerals & Mining platform. 

Key Guidelines:
- Be professional yet friendly
- Provide accurate information about mining investments and shares
- Help users with wallet management, transactions, and trading
- Explain complex financial concepts simply
- Always prioritize user security and privacy
- If you don't know something specific about Yawatu, say so honestly

Available Features:
- Share trading and investment guidance
- Wallet balance and transaction help
- Market analysis and mining profit insights
- Account management assistance
- Educational content about mining investments

Keep responses concise and actionable. Always confirm sensitive operations before proceeding.`,
              voice: 'alloy',
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              input_audio_transcription: {
                model: 'whisper-1'
              },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 1000
              },
              tools: [
                {
                  type: 'function',
                  name: 'get_user_balance',
                  description: 'Get the current wallet balance for the user',
                  parameters: {
                    type: 'object',
                    properties: {
                      currency: { type: 'string', default: 'UGX' }
                    },
                    required: []
                  }
                },
                {
                  type: 'function',
                  name: 'get_share_prices',
                  description: 'Get current share prices and market information',
                  parameters: {
                    type: 'object',
                    properties: {
                      share_id: { type: 'string' }
                    },
                    required: []
                  }
                },
                {
                  type: 'function',
                  name: 'get_transaction_history',
                  description: 'Get recent transaction history for the user',
                  parameters: {
                    type: 'object',
                    properties: {
                      limit: { type: 'number', default: 10 }
                    },
                    required: []
                  }
                }
              ],
              tool_choice: 'auto',
              temperature: 0.8,
              max_response_output_tokens: 'inf'
            }
          };
          
          openAISocket?.send(JSON.stringify(sessionConfig));
        }

        // Handle function calls
        if (data.type === 'response.function_call_arguments.done') {
          console.log('🔧 Function call completed:', data.name);
          handleFunctionCall(data, openAISocket);
        }

        // Forward all messages to client
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(event.data);
        }
      } catch (error) {
        console.error('❌ Error processing OpenAI message:', error);
      }
    };

    openAISocket.onerror = (error) => {
      console.error('❌ OpenAI WebSocket error:', error);
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Connection to AI service lost'
        }));
      }
    };

    openAISocket.onclose = (event) => {
      console.log('🔌 OpenAI WebSocket closed:', event.code, event.reason);
      if (socket.readyState === WebSocket.OPEN) {
        socket.close(1011, 'AI service disconnected');
      }
    };

    // Handle client messages
    socket.onmessage = (event) => {
      try {
        console.log('📤 Client message received');
        if (openAISocket?.readyState === WebSocket.OPEN) {
          openAISocket.send(event.data);
        }
      } catch (error) {
        console.error('❌ Error forwarding client message:', error);
      }
    };

    socket.onclose = (event) => {
      console.log('🔌 Client WebSocket closed:', event.code, event.reason);
      openAISocket?.close();
    };

    socket.onerror = (error) => {
      console.error('❌ Client WebSocket error:', error);
      openAISocket?.close();
    };

  } catch (error) {
    console.error('❌ Error setting up WebSocket relay:', error);
    if (socket.readyState === WebSocket.OPEN) {
      socket.close(1011, 'Setup failed');
    }
  }

  return response;
});

function handleFunctionCall(data: any, openAISocket: WebSocket | null) {
  try {
    const functionName = data.name;
    const args = JSON.parse(data.arguments || '{}');
    
    let result: any = {};

    switch (functionName) {
      case 'get_user_balance':
        result = {
          balance: 2500000,
          currency: args.currency || 'UGX',
          last_updated: new Date().toISOString()
        };
        break;
        
      case 'get_share_prices':
        result = {
          shares: [
            {
              id: 'kasese-cobalt',
              name: 'Kasese Cobalt Mining',
              price: 85000,
              currency: 'UGX',
              change_24h: '+2.4%',
              available: 1250
            },
            {
              id: 'mubende-gold',
              name: 'Mubende Gold Project',
              price: 120000,
              currency: 'UGX', 
              change_24h: '+1.8%',
              available: 890
            }
          ]
        };
        break;
        
      case 'get_transaction_history':
        result = {
          transactions: [
            {
              id: '1',
              type: 'share_purchase',
              amount: -340000,
              currency: 'UGX',
              description: 'Purchased 4 Kasese Cobalt shares',
              timestamp: new Date(Date.now() - 3600000).toISOString()
            },
            {
              id: '2',
              type: 'deposit',
              amount: 500000,
              currency: 'UGX',
              description: 'Mobile money deposit',
              timestamp: new Date(Date.now() - 7200000).toISOString()
            }
          ]
        };
        break;
        
      default:
        result = { error: `Unknown function: ${functionName}` };
    }

    // Send function result back to OpenAI
    const functionResponse = {
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: data.call_id,
        output: JSON.stringify(result)
      }
    };

    openAISocket?.send(JSON.stringify(functionResponse));
    console.log(`✅ Function ${functionName} executed successfully`);

  } catch (error) {
    console.error(`❌ Error executing function ${data.name}:`, error);
    
    const errorResponse = {
      type: 'conversation.item.create', 
      item: {
        type: 'function_call_output',
        call_id: data.call_id,
        output: JSON.stringify({ error: error.message })
      }
    };

    openAISocket?.send(JSON.stringify(errorResponse));
  }
}