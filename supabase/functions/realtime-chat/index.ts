import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  console.log("🚀 Starting WebSocket connection to OpenAI Realtime API");

  const { socket, response } = Deno.upgradeWebSocket(req);
  let openAISocket: WebSocket | null = null;
  let sessionCreated = false;

  socket.onopen = () => {
    console.log("✅ Client WebSocket connected");
    
    // Connect to OpenAI Realtime API
    const openAIUrl = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
    openAISocket = new WebSocket(openAIUrl, {
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "OpenAI-Beta": "realtime=v1"
      }
    });

    openAISocket.onopen = () => {
      console.log("✅ Connected to OpenAI Realtime API");
    };

    openAISocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📥 OpenAI message type:", data.type);

        // Handle session.created event
        if (data.type === "session.created") {
          console.log("🎯 Session created, sending session.update");
          sessionCreated = true;
          
          const sessionUpdate = {
            type: "session.update",
            session: {
              modalities: ["text", "audio"],
              instructions: `You are YawaTug's AI Assistant for administrators. You help with:
                - Transaction approvals and wallet management
                - User verification and account management  
                - System analytics and reporting
                - Administrative task automation
                - Data insights and recommendations
                
                Keep responses concise and professional. When asked about specific data, acknowledge that you'd need to check the latest information from the system.
                
                Available functions:
                - get_system_metrics: Get current system health and metrics
                - get_pending_approvals: Get pending transactions and verifications
                - search_users: Search for specific users
                - generate_report: Generate administrative reports`,
              voice: "alloy",
              input_audio_format: "pcm16",
              output_audio_format: "pcm16",
              input_audio_transcription: {
                model: "whisper-1"
              },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 1000
              },
              tools: [
                {
                  type: "function",
                  name: "get_system_metrics",
                  description: "Get current system health, user counts, transaction volumes, and wallet balances",
                  parameters: {
                    type: "object",
                    properties: {
                      metric_type: { 
                        type: "string",
                        enum: ["overview", "transactions", "users", "wallets"],
                        description: "Type of metrics to retrieve"
                      }
                    },
                    required: ["metric_type"]
                  }
                },
                {
                  type: "function", 
                  name: "get_pending_approvals",
                  description: "Get list of pending transaction approvals and user verifications",
                  parameters: {
                    type: "object",
                    properties: {
                      approval_type: {
                        type: "string",
                        enum: ["transactions", "verifications", "all"],
                        description: "Type of approvals to retrieve"
                      },
                      priority: {
                        type: "string",
                        enum: ["high", "normal", "all"],
                        description: "Priority level filter"
                      }
                    },
                    required: ["approval_type"]
                  }
                },
                {
                  type: "function",
                  name: "search_users", 
                  description: "Search for users by name, email, or ID",
                  parameters: {
                    type: "object",
                    properties: {
                      query: {
                        type: "string",
                        description: "Search query (name, email, or user ID)"
                      },
                      status: {
                        type: "string",
                        enum: ["active", "pending", "blocked", "all"],
                        description: "User status filter"
                      }
                    },
                    required: ["query"]
                  }
                }
              ],
              tool_choice: "auto",
              temperature: 0.7,
              max_response_output_tokens: "inf"
            }
          };

          openAISocket!.send(JSON.stringify(sessionUpdate));
        }

        // Handle function calls
        if (data.type === "response.function_call_arguments.done") {
          console.log("🔧 Function call:", data.name, data.arguments);
          handleFunctionCall(data, openAISocket!);
        }

        // Forward all messages to client
        socket.send(event.data);
      } catch (error) {
        console.error("❌ Error processing OpenAI message:", error);
      }
    };

    openAISocket.onerror = (error) => {
      console.error("❌ OpenAI WebSocket error:", error);
      socket.send(JSON.stringify({
        type: "error",
        message: "Connection to AI service failed"
      }));
    };

    openAISocket.onclose = () => {
      console.log("🔌 OpenAI WebSocket closed");
      socket.close();
    };
  };

  socket.onmessage = (event) => {
    if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
      console.log("📤 Forwarding client message to OpenAI");
      openAISocket.send(event.data);
    } else {
      console.error("❌ OpenAI socket not ready");
    }
  };

  socket.onclose = () => {
    console.log("🔌 Client WebSocket closed");
    if (openAISocket) {
      openAISocket.close();
    }
  };

  socket.onerror = (error) => {
    console.error("❌ Client WebSocket error:", error);
  };

  return response;
});

// Function call handler
async function handleFunctionCall(data: any, openAISocket: WebSocket) {
  try {
    const args = JSON.parse(data.arguments);
    let result: any = {};

    switch (data.name) {
      case "get_system_metrics":
        result = await getSystemMetrics(args.metric_type);
        break;
      case "get_pending_approvals": 
        result = await getPendingApprovals(args.approval_type, args.priority);
        break;
      case "search_users":
        result = await searchUsers(args.query, args.status);
        break;
      default:
        result = { error: "Unknown function" };
    }

    // Send function result back to OpenAI
    const functionResult = {
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: data.call_id,
        output: JSON.stringify(result)
      }
    };

    openAISocket.send(JSON.stringify(functionResult));
    openAISocket.send(JSON.stringify({ type: "response.create" }));

  } catch (error) {
    console.error("❌ Function call error:", error);
  }
}

// Mock function implementations (replace with real Supabase queries)
async function getSystemMetrics(metricType: string) {
  console.log("📊 Getting system metrics:", metricType);
  
  // Mock data - replace with real Supabase queries
  const metrics = {
    overview: {
      total_users: 1250,
      active_users: 890,
      pending_verifications: 23,
      pending_transactions: 12,
      total_balance: 150000,
      daily_volume: 45000,
      system_health: "healthy"
    },
    transactions: {
      pending_count: 12,
      daily_volume: 45000,
      weekly_volume: 280000,
      high_value_pending: 3
    },
    users: {
      total_users: 1250,
      verified_users: 1180,
      pending_verifications: 23,
      blocked_users: 47
    },
    wallets: {
      total_balance: 150000,
      admin_fund: 25000,
      project_funding: 90000,
      buyback_fund: 35000
    }
  };

  return metrics[metricType as keyof typeof metrics] || metrics.overview;
}

async function getPendingApprovals(approvalType: string, priority?: string) {
  console.log("⏳ Getting pending approvals:", approvalType, priority);
  
  // Mock data - replace with real Supabase queries
  return {
    transactions: [
      { id: "tx001", amount: 15000, type: "withdrawal", priority: "high", user: "John Doe" },
      { id: "tx002", amount: 8500, type: "deposit", priority: "normal", user: "Jane Smith" }
    ],
    verifications: [
      { id: "ver001", user: "Alice Johnson", submitted: "2024-01-15", priority: "normal" },
      { id: "ver002", user: "Bob Wilson", submitted: "2024-01-14", priority: "high" }
    ],
    count: {
      transactions: 12,
      verifications: 23,
      high_priority: 5
    }
  };
}

async function searchUsers(query: string, status?: string) {
  console.log("🔍 Searching users:", query, status);
  
  // Mock data - replace with real Supabase queries
  return {
    results: [
      { 
        id: "user001", 
        name: "John Doe", 
        email: "john@example.com", 
        status: "active",
        verified: true,
        last_login: "2024-01-15"
      }
    ],
    total: 1
  };
}