import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Send, Mic, MicOff, User, Bot, MessageCircle, Star, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PublicChatBotProps {
  onClose?: () => void;
}

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action?: string;
}

export const SimpleChatBot: React.FC<PublicChatBotProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [isHumanAgent, setIsHumanAgent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [voiceMuted, setVoiceMuted] = useState(false);

  // Quick action buttons
  const quickActions: QuickAction[] = [
    {
      id: 'buy_shares',
      label: 'Buy Shares',
      description: 'Learn how to purchase shares',
      icon: <MessageCircle className="w-4 h-4" />,
      action: 'How do I buy Yawatu shares?'
    },
    {
      id: 'wallet_info',
      label: 'My Wallet',
      description: 'Wallet & payments',
      icon: <MessageCircle className="w-4 h-4" />,
      action: 'Tell me about the wallet and payment options'
    },
    {
      id: 'kyc_status',
      label: 'KYC Help',
      description: 'Verification guidance',
      icon: <HelpCircle className="w-4 h-4" />,
      action: 'How do I complete KYC verification?'
    },
    {
      id: 'referral_program',
      label: 'Earn 5%',
      description: 'Referral program',
      icon: <Star className="w-4 h-4" />,
      action: 'Tell me about the referral program'
    },
  ];

  // Initialize audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // Welcome message
  useEffect(() => {
    const welcomeMessage: Message = {
      role: 'assistant',
      content: `Hi! 👋 I'm your Yawatu AI Assistant powered by Dialogflow CX!\n\nI'm here to help you become a LIFETIME OWNER of Yawatu shares. Ask me anything about:\n\n✅ How to buy shares (UGX 20,000 each)\n✅ Our 5% referral program (lifetime passive income!)\n✅ Wallet & payment options\n✅ KYC verification\n✅ Becoming an agent\n\nReady to start building wealth through mining? Let's chat! 💎`,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to agent messages for this session
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`visitor-chat-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chatbot_messages',
          filter: `metadata->session_id=eq.${sessionId}`
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.message_type === 'human_agent') {
            const agentMessage: Message = {
              role: 'assistant',
              content: newMsg.content,
              timestamp: new Date(newMsg.created_at)
            };
            setMessages(prev => [...prev, agentMessage]);
            setIsHumanAgent(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, voiceMuted]);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      toast.success('Recording started');
    } catch (error) {
      console.error('Recording error:', error);
      toast.error('Failed to start recording');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Play audio response
  const playAudioResponse = async (audioBase64: string) => {
    if (!audioContextRef.current || voiceMuted) return;
    
    try {
      // Decode base64 to array buffer
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Decode audio data
      const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start(0);
    } catch (error) {
      console.error('Audio playback error:', error);
      // Fallback to text-to-speech if audio fails
    }
  };

  // Transcribe audio using Dialogflow (audio input support)
  const transcribeAudio = async (audioBlob: Blob) => {
    setIsLoading(true);
    try {
      // Convert audio to base64
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Failed to read audio'));
        reader.readAsDataURL(audioBlob);
      });

      // Send audio to Dialogflow
      const { data, error } = await supabase.functions.invoke('dialogflow-chat', {
        body: { 
          audioInput: base64Audio,
          sessionId 
        }
      });

      if (error || !data?.response) {
        toast.error('Voice input failed');
        return;
      }

      // Display transcribed message and response
      const userMessage: Message = {
        role: 'user',
        content: data.transcript || '[Voice message]',
        timestamp: new Date()
      };
      
      const aiMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage, aiMessage]);
      
      // Play audio response if available
      if (data.audioContent && !voiceMuted) {
        await playAudioResponse(data.audioContent);
      }
      
      toast.success('Voice message processed');
    } catch (err) {
      console.error('Voice input error:', err);
      toast.error('Failed to process voice input');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle quick action
  const handleQuickAction = (action: QuickAction) => {
    if (action.action) {
      setInputMessage(action.action);
      handleSendMessage(new Event('submit') as any, false, action.action);
    }
    setShowQuickActions(false);
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent, forwardToHuman = false, quickActionText?: string) => {
    e.preventDefault();
    const messageText = quickActionText || (forwardToHuman ? 'Connect me with a human assistant' : inputMessage.trim());
    
    if (!messageText || isLoading) return;
    
    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setShowQuickActions(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Use Dialogflow CX
      const { data, error } = await supabase.functions.invoke('dialogflow-chat', {
        body: {
          message: messageText,
          sessionId,
          conversationId: user?.id || sessionId
        }
      });

      if (error) {
        const errMsg = (error as any)?.message || 'AI service unavailable';
        let displayMessage = "I'm having trouble right now. I've notified our human agents who will respond shortly. Please wait a moment.";
        
        if (errMsg.includes('429') || errMsg.includes('quota')) {
          toast.error('AI temporarily unavailable - connecting you with human agent');
        } else if (errMsg.includes('401') || errMsg.includes('api key')) {
          toast.error('Service configuration error - connecting you with human agent');
        } else {
          toast.error('Connecting you with human agent');
        }
        
        // Add fallback message from the response
        const aiMessage: Message = {
          role: 'assistant',
          content: displayMessage,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, aiMessage]);
        setIsHumanAgent(true);
        return;
      }

      const aiResponse = data?.response || data?.error || "I'm having trouble processing your request.";
      if (forwardToHuman) {
        toast.success("We've notified a human assistant. They'll reach out soon.");
      }
      
      const aiMessage: Message = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Play audio response if available
      if (data?.audioContent && !voiceMuted) {
        await playAudioResponse(data.audioContent);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  return (
    <Card className="w-full h-[500px] sm:h-[600px] flex flex-col border-0 shadow-2xl rounded-2xl overflow-hidden">
      <CardHeader className="flex-shrink-0 border-b bg-gradient-to-r from-primary to-primary/90 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-primary-foreground">Yawatu Assistant</CardTitle>
              <p className="text-xs text-primary-foreground/90 flex items-center gap-1">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isHumanAgent ? "bg-green-300 animate-pulse" : "bg-blue-300"
                )}></span>
                {isHumanAgent ? 'Live Agent' : 'AI Assistant'}
              </p>
            </div>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-primary-foreground hover:bg-white/10 h-8 w-8 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
        {/* Quick Actions */}
        {showQuickActions && messages.length === 1 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Quick Actions</p>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action)}
                  className="h-auto py-2.5 px-3 flex flex-col items-start gap-1 text-left hover:bg-primary/5 hover:border-primary/20 transition-all"
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className="text-primary">{action.icon}</div>
                    <span className="text-xs font-medium">{action.label}</span>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "flex gap-2 items-start animate-in fade-in-50 slide-in-from-bottom-2",
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[75%] rounded-2xl p-3 shadow-sm",
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                  : 'bg-card border rounded-tl-sm'
              )}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              <p className={cn(
                "text-xs mt-1.5 opacity-60",
                message.role === 'user' ? 'text-primary-foreground' : 'text-muted-foreground'
              )}>
                {formatDistanceToNow(message.timestamp, { addSuffix: true })}
              </p>
            </div>
            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center shadow-sm">
                <User className="w-5 h-5 text-secondary-foreground" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-2 items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="bg-card border rounded-2xl rounded-tl-sm p-3 shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </CardContent>

      <div className="flex-shrink-0 border-t p-4 bg-card">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Button
            type="button"
            variant={isRecording ? "destructive" : "outline"}
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading}
            className={cn(
              "flex-shrink-0 h-10 w-10 rounded-full transition-all",
              isRecording && "animate-pulse"
            )}
            title={isRecording ? "Stop recording" : "Voice input"}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isRecording ? "Recording..." : "Type your message..."}
            disabled={isLoading || isRecording}
            className="flex-1 text-sm rounded-full border-2 focus:border-primary"
          />
          <Button 
            type="submit" 
            disabled={isLoading || !inputMessage.trim()}
            size="icon"
            className="flex-shrink-0 h-10 w-10 rounded-full"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        {!isHumanAgent && (
          <Button
            onClick={(e) => handleSendMessage(e, true)}
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Need help? Connect with a live agent
          </Button>
        )}
      </div>
    </Card>
  );
};