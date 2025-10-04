import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MessageSquare, Users, Clock, CheckCircle } from 'lucide-react';
import { AgentChatInterface } from '@/components/admin/AgentChatInterface';
import { AgentAvailabilityToggle } from '@/components/admin/AgentAvailabilityToggle';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';

interface PendingChat {
  id: string;
  session_id: string;
  visitor_identifier: string | null;
  escalation_reason: string | null;
  created_at: string;
  total_messages: number;
}

interface Assignment {
  id: string;
  conversation_id: string;
  status: string;
  assigned_at: string;
  priority: string;
}

export const AdminAgentChats: React.FC = () => {
  const { user } = useAuth();
  const [pendingChats, setPendingChats] = useState<PendingChat[]>([]);
  const [myAssignments, setMyAssignments] = useState<Assignment[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load pending chats and assignments
  const loadChats = async () => {
    if (!user) return;

    setIsLoading(true);
    
    // Load unassigned chats that need human help
    const { data: unassigned } = await supabase
      .from('chatbot_conversations')
      .select('*')
      .eq('escalated_to_human', true)
      .is('resolved', false)
      .not('id', 'in', 
        supabase.from('chat_assignments').select('conversation_id')
      )
      .order('created_at', { ascending: true });

    if (unassigned) {
      setPendingChats(unassigned);
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

    setIsLoading(false);
  };

  useEffect(() => {
    loadChats();

    // Subscribe to new escalated chats
    const chatsChannel = supabase
      .channel('admin-chats')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chatbot_conversations',
          filter: 'escalated_to_human=eq.true'
        },
        () => {
          loadChats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_assignments',
        },
        () => {
          loadChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatsChannel);
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

      toast.success('Chat assigned to you');
      loadChats();
      setSelectedChat(conversationId);
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

      toast.success('Chat marked as completed');
      loadChats();
      setSelectedChat(null);
    } catch (error) {
      console.error('Complete chat error:', error);
      toast.error('Failed to complete chat');
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Please log in to access agent chats</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agent Chat Management</h1>
        <div className="flex items-center gap-2">
          <Link to="/admin/dialogflow-settings">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              AI Settings
            </Button>
          </Link>
          <AgentAvailabilityToggle />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Pending & My Chats */}
        <div className="lg:col-span-1 space-y-4">
          {/* Pending Chats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="w-5 h-5" />
                Pending Chats
                <Badge variant="secondary">{pendingChats.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
              {pendingChats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No pending chats
                </p>
              ) : (
                pendingChats.map((chat) => (
                  <Card key={chat.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {chat.visitor_identifier || 'Anonymous'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {chat.total_messages} messages
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(chat.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAcceptChat(chat.id)}
                      >
                        Accept
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          {/* My Active Chats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5" />
                My Active Chats
                <Badge variant="secondary">{myAssignments.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
              {myAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active chats
                </p>
              ) : (
                myAssignments.map((assignment) => (
                  <Card 
                    key={assignment.id} 
                    className={`p-3 cursor-pointer hover:bg-muted ${
                      selectedChat === assignment.conversation_id ? 'border-primary' : ''
                    }`}
                    onClick={() => setSelectedChat(assignment.conversation_id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={assignment.status === 'accepted' ? 'default' : 'secondary'}>
                            {assignment.status}
                          </Badge>
                          {assignment.priority !== 'normal' && (
                            <Badge variant="destructive">{assignment.priority}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(assignment.assigned_at).toLocaleTimeString()}
                        </p>
                      </div>
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
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Chat Interface */}
        <div className="lg:col-span-2">
          {selectedChat ? (
            <AgentChatInterface 
              conversationId={selectedChat}
              onClose={() => setSelectedChat(null)}
            />
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <CardContent>
                <div className="text-center space-y-2">
                  <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Select a chat to start responding
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
