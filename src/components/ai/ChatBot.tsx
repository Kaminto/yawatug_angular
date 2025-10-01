import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Minimize2, 
  Maximize2,
  Mic,
  MicOff,
  Volume2,
  VolumeX
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isTyping?: boolean;
}

interface ChatBotProps {
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  userRole?: 'admin' | 'user';
}

const ChatBot: React.FC<ChatBotProps> = ({ 
  isMinimized = false, 
  onToggleMinimize,
  userRole = 'user'
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize with welcome message
    const welcomeMessage: Message = {
      id: 'welcome',
      content: userRole === 'admin' 
        ? 'Hello! I\'m your AI assistant. I can help you with admin tasks, system queries, user management, and more. What would you like to know?'
        : 'Hi! I\'m here to help you with your account, transactions, and any questions about our platform. How can I assist you today?',
      role: 'assistant',
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, [userRole]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const getSystemContext = () => {
    const baseContext = `You are an AI assistant for YAWATU platform. User role: ${userRole}.`;
    
    if (userRole === 'admin') {
      return `${baseContext} You help with:
- User verification and management
- Transaction approvals and monitoring
- System health and analytics
- Financial oversight and reporting
- Voting proposal management
- Platform administration tasks
Provide concise, actionable responses for admin operations.`;
    } else {
      return `${baseContext} You help with:
- Account management and verification
- Transaction history and support
- Share purchases and investments
- Voting participation
- Platform navigation and features
- General support and FAQs
Be helpful and user-friendly in your responses.`;
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Add typing indicator
    const typingMessage: Message = {
      id: 'typing',
      content: 'AI is thinking...',
      role: 'assistant',
      timestamp: new Date(),
      isTyping: true
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: content,
          context: getSystemContext(),
          userId: user?.id,
          userRole,
          conversationHistory: messages.slice(-5) // Send last 5 messages for context
        }
      });

      if (error) {
        throw error;
      }

      const assistantMessage: Message = {
        id: Date.now().toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => prev.filter(m => m.id !== 'typing').concat(assistantMessage));

      // Text-to-speech if enabled
      if (speechEnabled) {
        speakMessage(data.response);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: 'error',
        content: 'Sorry, I encountered an error. Please try again later.',
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => prev.filter(m => m.id !== 'typing').concat(errorMessage));
      toast.error('Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  };

  const speakMessage = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  };

  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast.error('Speech recognition failed');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      toast.error('Speech recognition not supported in this browser');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(input);
    }
  };

  const quickActions = userRole === 'admin' ? [
    'Show pending verifications',
    'System health status',
    'Today\'s transaction volume',
    'Active voting proposals'
  ] : [
    'Check my balance',
    'How to buy shares',
    'Account verification status',
    'Recent transactions'
  ];

  if (isMinimized) {
    return (
      <Button
        onClick={onToggleMinimize}
        className="fixed bottom-4 right-4 rounded-full w-14 h-14 shadow-lg"
        size="lg"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-[600px] shadow-xl z-50 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="h-5 w-5" />
          AI Assistant
          <Badge variant="outline" className="text-xs">
            {userRole === 'admin' ? 'Admin' : 'User'}
          </Badge>
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSpeechEnabled(!speechEnabled)}
          >
            {speechEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={onToggleMinimize}>
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-4 gap-4">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => handleSendMessage(action)}
              disabled={isLoading}
            >
              {action}
            </Button>
          ))}
        </div>

        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {message.role === 'assistant' && <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                    {message.role === 'user' && <User className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                    <div className="flex-1">
                      <div className={`text-sm ${message.isTyping ? 'animate-pulse' : ''}`}>
                        {message.content}
                      </div>
                      <div className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={startListening}
            disabled={isLoading || isListening}
            className="px-3"
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button
            onClick={() => handleSendMessage(input)}
            disabled={isLoading || !input.trim()}
            size="sm"
            className="px-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatBot;