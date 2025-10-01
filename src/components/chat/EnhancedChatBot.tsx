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
  userRole?: 'user' | 'admin';
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

  // Welcome message with auto-play voice
  useEffect(() => {
    const welcomeMessage = userRole === 'admin' 
      ? "Hello! I'm your Yawatu Admin Assistant with enhanced voice capabilities. I can help you manage the platform, analyze data, and provide administrative insights. Try the voice chat feature for real-time conversations! What would you like to know?"
      : "Welcome to Yawatu Minerals & Mining! I'm your AI investment assistant with professional voice support powered by ElevenLabs. I can help you with share investments, bookings, referral earnings, wallet management, and answer any questions about our mining operations. You can type or use the Voice Chat feature for natural conversations. How may I assist you today?";

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
            systemContext: `You are Yawatu's AI assistant. Help users with:
            - Share investments and bookings (down payments, installments)
            - Referral program (5% commission on all purchases and bookings)
            - Wallet management (deposits, withdrawals, transfers)
            - Mining operations and company information
            Be friendly, informative, and use emojis appropriately. Always provide accurate information about commission rates, payment plans, and investment opportunities.`
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