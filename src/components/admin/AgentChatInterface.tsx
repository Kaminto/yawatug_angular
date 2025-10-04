import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Send, User, Bot, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  message_type: string;
  created_at: string;
  metadata?: any;
}

interface AgentChatInterfaceProps {
  conversationId: string;
  onClose: () => void;
}

export const AgentChatInterface: React.FC<AgentChatInterfaceProps> = ({
  conversationId,
  onClose
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationInfo, setConversationInfo] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversation details and messages
  useEffect(() => {
    const loadConversation = async () => {
      // Load conversation info
      const { data: convData } = await supabase
        .from('chatbot_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convData) {
        setConversationInfo(convData);
      }

      // Load messages
      const { data: messagesData } = await supabase
        .from('chatbot_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesData) {
        setMessages(messagesData.map(msg => ({
          ...msg,
          role: msg.role as 'user' | 'assistant'
        })));
      }
    };

    loadConversation();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chatbot_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMsg = payload.new as any;
          setMessages(prev => [...prev, {
            ...newMsg,
            role: newMsg.role as 'user' | 'assistant'
          }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !user || isLoading) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-agent-message', {
        body: {
          conversationId,
          message: inputMessage,
          agentId: user.id
        }
      });

      if (error) throw error;

      setInputMessage('');
      toast.success('Message sent');
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="flex-shrink-0 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              Chat with {conversationInfo?.visitor_identifier || 'Visitor'}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {messages.length} messages
              </Badge>
              {conversationInfo?.escalation_reason && (
                <Badge variant="secondary" className="text-xs">
                  {conversationInfo.escalation_reason}
                </Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-2 items-start animate-in fade-in",
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                {message.message_type === 'human_agent' ? (
                  <User className="w-4 h-4 text-primary-foreground" />
                ) : (
                  <Bot className="w-4 h-4 text-primary-foreground" />
                )}
              </div>
            )}
            <div
              className={cn(
                "max-w-[75%] rounded-lg p-2.5 text-sm",
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : message.message_type === 'human_agent'
                  ? 'bg-secondary text-secondary-foreground'
                  : 'bg-muted'
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
              </p>
            </div>
            {message.role === 'user' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-4 h-4 text-secondary-foreground" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </CardContent>

      <div className="flex-shrink-0 border-t p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            type="text"
            placeholder="Type your response..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!inputMessage.trim() || isLoading}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
};
