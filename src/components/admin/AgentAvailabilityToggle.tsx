import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Power, PowerOff } from 'lucide-react';

export const AgentAvailabilityToggle: React.FC = () => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [currentChats, setCurrentChats] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadStatus = async () => {
      const { data } = await supabase
        .from('agent_chat_availability')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setIsOnline(data.is_online);
        setCurrentChats(data.current_chat_count);
      }
    };

    loadStatus();

    // Subscribe to changes
    const channel = supabase
      .channel('agent-availability')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_chat_availability',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new) {
            setIsOnline((payload.new as any).is_online);
            setCurrentChats((payload.new as any).current_chat_count);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const toggleAvailability = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from('agent_chat_availability')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('agent_chat_availability')
          .update({ is_online: !isOnline })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('agent_chat_availability')
          .insert({
            user_id: user.id,
            is_online: true
          });

        if (error) throw error;
      }

      toast.success(isOnline ? 'You are now offline' : 'You are now online');
    } catch (error) {
      console.error('Toggle availability error:', error);
      toast.error('Failed to update availability');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Badge variant={isOnline ? 'default' : 'secondary'}>
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
        {currentChats > 0 && (
          <Badge variant="outline">
            {currentChats} active
          </Badge>
        )}
      </div>
      <Button
        size="sm"
        variant={isOnline ? 'destructive' : 'default'}
        onClick={toggleAvailability}
        disabled={isLoading}
        className="gap-2"
      >
        {isOnline ? (
          <>
            <PowerOff className="w-4 h-4" />
            Go Offline
          </>
        ) : (
          <>
            <Power className="w-4 h-4" />
            Go Online
          </>
        )}
      </Button>
    </div>
  );
};
