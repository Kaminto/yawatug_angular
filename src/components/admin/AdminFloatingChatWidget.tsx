import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AdminChatPanel } from './AdminChatPanel';
import { cn } from '@/lib/utils';

export const AdminFloatingChatWidget: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [myActiveCount, setMyActiveCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check if user is admin
    const checkAdmin = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', user.id)
        .single();
      
      setIsAdmin(data?.user_role === 'admin' || data?.user_role === 'agent');
    };

    checkAdmin();
  }, [user]);

  useEffect(() => {
    if (!user || !isAdmin) return;

    const loadCounts = async () => {
      // Count pending unassigned chats
      const { count: pending } = await supabase
        .from('chatbot_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('escalated_to_human', true)
        .is('resolved', false);

      // Count my active assignments
      const { count: active } = await supabase
        .from('chat_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .in('status', ['pending', 'accepted']);

      setPendingCount(pending || 0);
      setMyActiveCount(active || 0);
    };

    loadCounts();

    // Subscribe to changes
    const channel = supabase
      .channel('admin-chat-counts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chatbot_conversations',
        },
        loadCounts
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_assignments',
        },
        loadCounts
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin]);

  const totalCount = pendingCount + myActiveCount;

  if (!user || !isAdmin) return null;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {isOpen && (
          <AdminChatPanel onClose={() => setIsOpen(false)} />
        )}
        
        <Button
          size="lg"
          className={cn(
            "rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all",
            totalCount > 0 && "animate-pulse"
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <>
              <MessageSquare className="w-6 h-6" />
              {totalCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center"
                >
                  {totalCount > 9 ? '9+' : totalCount}
                </Badge>
              )}
            </>
          )}
        </Button>
      </div>
    </>
  );
};
