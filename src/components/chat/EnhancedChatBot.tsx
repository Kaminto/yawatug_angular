import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Send, 
  Bot, 
  User, 
  Volume2, 
  VolumeX, 
  Loader2,
  Sparkles,
  Mic,
  Settings
} from 'lucide-react';
import { useEnhancedTextToSpeech } from '@/hooks/useEnhancedTextToSpeech';
import { useRealtimeVoiceChat } from '@/hooks/useRealtimeVoiceChat';
import { VoiceControls } from './VoiceControls';
import { VoiceSettingsDialog } from './VoiceSettings';
import { supabase } from '@/integrations/supabase/client';
import { yawutuKnowledgeBase } from '@/data/chatbotKnowledge';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isWelcome?: boolean;
  isAudio?: boolean;
}

interface EnhancedChatBotProps {
  userRole?: 'user' | 'admin' | 'visitor';
  visitorContext?: any;
}

export const EnhancedChatBot: React.FC<EnhancedChatBotProps> = ({
  userRole = 'user',
  visitorContext
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Enhanced TTS with ElevenLabs support
  const { 
    speak, 
    stop: stopSpeech, 
    isPlaying: isSpeechPlaying,
    settings: voiceSettings,
    updateSettings: updateVoiceSettings,
    availableVoices
  } = useEnhancedTextToSpeech();

  // Real-time voice chat
  const {
    isConnected: isVoiceConnected,
    isRecording,
    isSpeaking: isAISpeaking,
    messages: voiceMessages,
    error: voiceError,
    connect: connectVoiceChat,
    disconnect: disconnectVoiceChat,
    startRecording,
    stopRecording,
    sendTextMessage: sendVoiceMessage,
    clearMessages: clearVoiceMessages
  } = useRealtimeVoiceChat();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, voiceMessages]);

  // Welcome message with auto-play voice - EMPHASIZING LIFETIME OWNERSHIP
  useEffect(() => {
    const welcomeMessage = userRole === 'admin' 
      ? "Hello! I'm your Yawatu Admin Assistant with enhanced voice capabilities. I can help you manage the platform, analyze data, process verifications, monitor transactions, and provide administrative insights. Use voice chat for hands-free support or type your questions. What would you like to know?"
      : "Welcome back to Yawatu Minerals & Mining! 🌟 As a shareholder, you're a LIFETIME OWNER of Uganda's mineral wealth, earning dividends as long as the company operates. I'm here to help you manage your investments, track your earnings, explore the referral program (5% commission forever!), handle wallet transactions, and answer any questions. How can I help you grow your wealth today? 💎";

    setMessages([{
      id: '1',
      type: 'ai',
      content: welcomeMessage,
      timestamp: new Date(),
      isWelcome: true
    }]);

    // Auto-play welcome message with voice
    setTimeout(() => {
      if (!isVoiceConnected) {
        speak(welcomeMessage);
      }
    }, 1000);
  }, [userRole]);

  // Merge voice messages with regular messages
  useEffect(() => {
    if (voiceMessages.length > 0) {
      const convertedMessages = voiceMessages.map(vm => ({
        id: vm.id,
        type: vm.type as 'user' | 'ai',
        content: vm.content,
        timestamp: vm.timestamp,
        isAudio: vm.isAudio
      }));
      setMessages(prev => {
        // Avoid duplicates by checking IDs
        const existingIds = new Set(prev.map(m => m.id));
        const newMessages = convertedMessages.filter(m => !existingIds.has(m.id));
        return [...prev, ...newMessages];
      });
    }
  }, [voiceMessages]);

  // Send message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;
    
    const message = inputMessage.trim();
    
    try {
      setIsLoading(true);
      
      // Add user message to chat
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: message,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setInputMessage('');

      // Send to voice chat if connected
      if (isVoiceConnected) {
        sendVoiceMessage(message);
        setIsLoading(false);
        return;
      }

      // Get AI response via regular API
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message,
          context: {
            knowledgeBase: yawutuKnowledgeBase,
            userRole,
            visitorContext,
            systemContext: `You are Yawatu's AI assistant for LOGGED-IN USERS who are already shareholders and LIFETIME OWNERS.

🌟 REMEMBER: These users are permanent co-owners of Yawatu who earn dividends for life!

Help them with:
- Share investments: Buy more shares from Dynamic Share Pool (UGX 20,000/share)
- Share bookings: Reserve shares with flexible installment plans (25% down, 30 days to complete)
- Referral program: Track 5% LIFETIME commission on all referrals' purchases and bookings
- Wallet management: Multi-currency wallets (UGX/USD), deposits, withdrawals, transfers
- Account verification: Complete profile for full platform access
- Dividend tracking: Monitor lifetime earnings from ownership
- Share trading: Sell or transfer shares, check buyback availability
- Mining operations: Updates on company performance and operations
- Voting rights: Participate in company decisions as owners

Current Platform Info (2025):
- Share price: UGX 20,000 per share
- Payment methods: Mobile Money (MTN/Airtel), M-Pesa, Bank Transfer
- Commission: 5% on all referral transactions (lifetime income)
- Wallet currencies: UGX and USD
- Account types: Individual, Joint, Company, Minor

Emphasize OWNERSHIP and LIFETIME EARNINGS. Be friendly, use emojis, provide accurate information, and help them maximize their investment returns! 💎`
          },
          conversationHistory: messages.slice(-10)
        }
      });

      if (error) {
        console.error('AI Assistant Error:', error);
        throw new Error('Failed to get AI response');
      }

      const aiResponse = data?.response || "I apologize, but I'm having trouble processing your request right now. Please try again.";
      
      // Add AI response to chat
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Auto-speak AI response
      if (aiResponse && !isSpeechPlaying && !isVoiceConnected) {
        setTimeout(() => speak(aiResponse), 500);
      }

    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-gradient-to-r from-primary/5 to-purple-500/5">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot className="h-8 w-8 text-primary" />
            <Sparkles className="h-3 w-3 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Yawatu AI Assistant</h2>
            <p className="text-sm text-muted-foreground">
              Powered by ElevenLabs Voice • Real-time Chat
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Voice Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (isSpeechPlaying) {
                stopSpeech();
              }
            }}
            title={isSpeechPlaying ? 'Stop speaking' : 'Voice enabled'}
          >
            {isSpeechPlaying ? (
              <VolumeX className="h-4 w-4 text-red-500" />
            ) : (
              <Volume2 className="h-4 w-4 text-green-600" />
            )}
          </Button>
          
          {isSpeechPlaying && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              <Volume2 className="h-3 w-3 mr-1 animate-pulse" />
              Speaking
            </Badge>
          )}
          <Badge variant="secondary" className={isVoiceConnected ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}>
            <div className={`w-2 h-2 rounded-full mr-1 animate-pulse ${isVoiceConnected ? 'bg-blue-500' : 'bg-green-500'}`} />
            {isVoiceConnected ? 'Voice Chat' : 'Online'}
          </Badge>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 gap-4 p-4">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}>
                  {message.type === 'ai' && (
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <Card className={`max-w-[80%] ${
                    message.type === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'border-primary/20'
                  }`}>
                    <CardContent className="p-3">
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs opacity-70">
                          {message.timestamp.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        {message.type === 'ai' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
                            onClick={() => speak(message.content)}
                          >
                            <Volume2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  {message.type === 'user' && (
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback className="bg-secondary">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={isVoiceConnected ? "Type or use voice..." : "Type your message..."}
                disabled={isLoading}
                className="flex-1"
              />
              <Button 
                type="submit" 
                disabled={isLoading || !inputMessage.trim()}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Voice Controls Sidebar */}
        <div className="w-80">
          <VoiceControls
            isConnected={isVoiceConnected}
            isRecording={isRecording}
            isSpeaking={isAISpeaking}
            onConnect={connectVoiceChat}
            onDisconnect={disconnectVoiceChat}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            isTTSPlaying={isSpeechPlaying}
            onStopTTS={stopSpeech}
            onOpenSettings={() => setShowVoiceSettings(true)}
            onVoiceCommand={(command) => {
              // Handle voice commands in the main chat
              if (command.startsWith('show') || command.startsWith('what')) {
                sendVoiceMessage(command);
              }
            }}
          />
        </div>
      </div>

      {/* Voice Settings Dialog */}
      <VoiceSettingsDialog
        open={showVoiceSettings}
        onOpenChange={setShowVoiceSettings}
        settings={voiceSettings}
        onUpdateSettings={updateVoiceSettings}
        availableVoices={availableVoices}
        onTestVoice={(text) => speak(text)}
      />
    </div>
  );
};