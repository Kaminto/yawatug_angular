// Public-facing chatbot for potential investors and new visitors
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  Bot,
  User,
  Volume2,
  VolumeX,
  Loader2,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useEnhancedTextToSpeech } from '@/hooks/useEnhancedTextToSpeech';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PublicChatBotProps {
  onClose?: () => void;
}

export const PublicChatBot: React.FC<PublicChatBotProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    isPlaying,
    speak,
    stop: stopSpeaking,
  } = useEnhancedTextToSpeech();

  // Welcome message for potential investors - emphasizing LIFETIME OWNERSHIP
  useEffect(() => {
    const welcomeMsg: Message = {
      role: 'assistant',
      content: "Welcome to Yawatu Minerals & Mining! 🌟 I'm here to help you become a LIFETIME OWNER of Uganda's mining wealth! When you invest with us, you don't just buy shares - you become a permanent co-owner who earns dividends for life. Start with just UGX 200,000 (10 shares) and join thousands building generational wealth. Plus, earn 5% commission on EVERY referral forever! Ready to own your future? 💎",
      timestamp: new Date(),
    };
    setMessages([welcomeMsg]);
    
    // Auto-play welcome message
    setTimeout(() => {
      speak(welcomeMsg.content);
    }, 500);
  }, [speak]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const systemContext = `You are Yawatu Assistant for Yawatu Minerals & Mining PLC - Uganda's premier mining investment platform.

🌟 CRITICAL MESSAGE: When someone invests in Yawatu, they become LIFETIME OWNERS, not just investors. They own part of the company FOREVER and earn dividends for as long as Yawatu operates. This is generational wealth building!

Current Investment Details (2025):
- Share Price: UGX 20,000 per share (current price)
- Minimum Investment: 10 shares = UGX 200,000 total
- No maximum limit - buy as many shares as you want
- Dynamic Share Pool: No batches, buy anytime directly from our share pool

Payment Options:
- MTN Mobile Money, Airtel Money, M-Pesa, Bank Transfer
- Full payment OR flexible installment plans
- Installments: 25% down payment, remaining balance within 30 days
- Booking system: Reserve shares with down payment, pay over time

💰 LIFETIME REFERRAL INCOME:
- Earn 5% commission on EVERY share purchase by your referrals
- Earn 5% on ALL bookings made by people you refer
- Commission paid for the LIFETIME of your referrals' activity
- Build passive income by growing your referral network
- Track all earnings in real-time

Account & Wallet Features:
- Account types: Individual, Joint, Company, Minor accounts
- Multi-currency wallets: UGX and USD
- Deposit/withdraw easily via mobile money or bank
- Transfer funds between users instantly
- Secure wallet management

Share Trading:
- Buy directly from Dynamic Share Pool (always available)
- Sell back when company buyback funds are available
- Transfer shares to other users instantly
- All digital - no paperwork needed

EMPHASIZE: Ownership is permanent. Dividends are lifetime income. Referral commissions are passive income forever. This is about building wealth that lasts generations!

Be enthusiastic, use emojis, focus on LIFETIME OWNERSHIP, and encourage them to start their wealth journey today! 🚀`;

      const { data, error } = await supabase.functions.invoke('chat-with-ai', {
        body: {
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: input.trim() },
          ],
          systemContext,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (isVoiceEnabled) {
        speak(assistantMessage.content);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I had trouble processing your request. Please try again or contact our support team.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="h-full flex flex-col shadow-2xl border-2 border-primary/20">
      <CardHeader className="flex-shrink-0 border-b bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
              <Bot className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Yawatu Investment Assistant</CardTitle>
              <p className="text-xs text-muted-foreground">Your guide to mining investments</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPlaying && (
              <Badge variant="secondary" className="animate-pulse">
                Speaking...
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (isPlaying) {
                  stopSpeaking();
                }
                setIsVoiceEnabled(!isVoiceEnabled);
              }}
              title={isVoiceEnabled ? 'Disable voice' : 'Enable voice'}
            >
              {isVoiceEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex gap-3 items-start',
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {msg.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={cn(
                    'rounded-lg px-4 py-2 max-w-[80%]',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground ml-auto'
                      : 'bg-muted'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 items-start">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="flex-shrink-0 border-t p-4 bg-background">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about investment opportunities..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Ready to invest? <button className="text-primary hover:underline font-medium" onClick={() => window.location.href = '/register'}>Sign up now</button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
