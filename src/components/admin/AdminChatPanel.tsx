import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MessageSquare, Users, CheckCircle } from 'lucide-react';
import { AgentChatInterface } from './AgentChatInterface';
import { formatDistanceToNow } from 'date-fns';

interface PendingChat {
  id: string;
  session_id: string;
  visitor_identifier: string | null;
  escalation_reason: string | null;
  created_at: string;
}

interface Assignment {
  id: string;
  conversation_id: string;
  status: string;
  assigned_at: string;
}

interface AdminChatPanelProps {
  onClose: () => void;
}

export const AdminChatPanel: React.FC<AdminChatPanelProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [pendingChats, setPendingChats] = useState<PendingChat[]>([]);
  const [myAssignments, setMyAssignments] = useState<Assignment[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  const loadChats = async () => {
    if (!user) return;

    // Load pending chats
    const { data: pending } = await supabase
      .from('chatbot_conversations')
      .select('*')
      .eq('escalated_to_human', true)
      .is('resolved', false)
      .order('created_at', { ascending: true })
      .limit(10);

    if (pending) {
      // Filter out already assigned chats
      const { data: assigned } = await supabase
        .from('chat_assignments')
        .select('conversation_id');
      
      const assignedIds = new Set(assigned?.map(a => a.conversation_id) || []);
      setPendingChats(pending.filter(c => !assignedIds.has(c.id)));
    }

    // Load my assignments
    const { data: assignments } = await supabase
      .from('chat_assignments')
      .select('*')
      .eq('assigned_to', user.id)
      .in('status', ['pending', 'accepted'])
      .order('assigned_at', { ascending: true });

    if (assignments) {
      setMyAssignments(assignments);
    }
  };

  useEffect(() => {
    loadChats();

    const channel = supabase
      .channel('floating-admin-chats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chatbot_conversations',
        },
        loadChats
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_assignments',
        },
        loadChats
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleAcceptChat = async (conversationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('chat_assignments')
        .insert({
          conversation_id: conversationId,
          assigned_to: user.id,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Chat accepted');
      loadChats();
      setSelectedChat(conversationId);
      setActiveTab('active');
    } catch (error) {
      console.error('Accept chat error:', error);
      toast.error('Failed to accept chat');
    }
  };

  const handleCompleteChat = async (assignmentId: string) => {
    try {
      const { error } = await supabase.rpc('complete_chat_assignment', {
        p_assignment_id: assignmentId
      });

      if (error) throw error;

      toast.success('Chat completed');
      loadChats();
      setSelectedChat(null);
    } catch (error) {
      console.error('Complete chat error:', error);
      toast.error('Failed to complete chat');
    }
  };

  if (selectedChat) {
    return (
      <Card className="w-[400px] h-[600px] shadow-2xl animate-in slide-in-from-bottom">
        <AgentChatInterface 
          conversationId={selectedChat}
          onClose={() => setSelectedChat(null)}
        />
      </Card>
    );
  }

  return (
    <Card className="w-[400px] h-[600px] shadow-2xl animate-in slide-in-from-bottom flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-lg">Chat Support</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0 mx-4">
            <TabsTrigger value="pending" className="relative">
              <MessageSquare className="w-4 h-4 mr-2" />
              Pending
              {pendingChats.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {pendingChats.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="relative">
              <Users className="w-4 h-4 mr-2" />
              Active
              {myAssignments.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {myAssignments.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="flex-1 overflow-y-auto px-4 space-y-2 mt-4">
            {pendingChats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pending chats</p>
              </div>
            ) : (
              pendingChats.map((chat) => (
                <Card key={chat.id} className="p-3 hover:border-primary transition-colors">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {chat.visitor_identifier || 'Anonymous Visitor'}
                        </p>
                        {chat.escalation_reason && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {chat.escalation_reason}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(chat.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleAcceptChat(chat.id)}
                    >
                      Accept Chat
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="active" className="flex-1 overflow-y-auto px-4 space-y-2 mt-4">
            {myAssignments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active chats</p>
              </div>
            ) : (
              myAssignments.map((assignment) => (
                <Card 
                  key={assignment.id} 
                  className="p-3 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setSelectedChat(assignment.conversation_id)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={assignment.status === 'accepted' ? 'default' : 'secondary'}>
                        {assignment.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(assignment.assigned_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedChat(assignment.conversation_id);
                        }}
                      >
                        Open Chat
                      </Button>
                      {assignment.status === 'accepted' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteChat(assignment.id);
                          }}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
