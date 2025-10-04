-- Create agent/admin chat availability tracking
CREATE TABLE IF NOT EXISTS public.agent_chat_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  max_concurrent_chats INTEGER DEFAULT 5,
  current_chat_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create chat assignments table
CREATE TABLE IF NOT EXISTS public.chat_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chatbot_conversations(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'transferred')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(conversation_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_availability_online ON public.agent_chat_availability(is_online, current_chat_count);
CREATE INDEX IF NOT EXISTS idx_chat_assignments_status ON public.chat_assignments(status, assigned_to);
CREATE INDEX IF NOT EXISTS idx_chat_assignments_conversation ON public.chat_assignments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_escalated ON public.chatbot_conversations(escalated_to_human, created_at);

-- Enable RLS
ALTER TABLE public.agent_chat_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_chat_availability
CREATE POLICY "Users can view their own availability"
  ON public.agent_chat_availability FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Agents/admins can view all availability"
  ON public.agent_chat_availability FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND user_role IN ('admin', 'agent')
    )
  );

CREATE POLICY "Users can update their own availability"
  ON public.agent_chat_availability FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own availability"
  ON public.agent_chat_availability FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for chat_assignments
CREATE POLICY "Agents can view their assignments"
  ON public.chat_assignments FOR SELECT
  USING (
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all assignments"
  ON public.chat_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  );

CREATE POLICY "Agents can update their own assignments"
  ON public.chat_assignments FOR UPDATE
  USING (auth.uid() = assigned_to);

-- Function to auto-assign chats to available agents
CREATE OR REPLACE FUNCTION public.auto_assign_chat_to_agent(p_conversation_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agent_id UUID;
BEGIN
  -- Find an available agent with lowest current chat count
  SELECT user_id INTO v_agent_id
  FROM public.agent_chat_availability
  WHERE is_online = true
    AND current_chat_count < max_concurrent_chats
  ORDER BY current_chat_count ASC, last_seen DESC
  LIMIT 1;

  -- If agent found, create assignment
  IF v_agent_id IS NOT NULL THEN
    INSERT INTO public.chat_assignments (
      conversation_id, assigned_to, status
    ) VALUES (
      p_conversation_id, v_agent_id, 'pending'
    );

    -- Update agent's current chat count
    UPDATE public.agent_chat_availability
    SET current_chat_count = current_chat_count + 1,
        updated_at = now()
    WHERE user_id = v_agent_id;

    RETURN v_agent_id;
  END IF;

  RETURN NULL;
END;
$$;

-- Function to update agent availability
CREATE OR REPLACE FUNCTION public.update_agent_last_seen()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_seen = now();
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_agent_last_seen_trigger
  BEFORE UPDATE ON public.agent_chat_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agent_last_seen();

-- Function to handle chat completion
CREATE OR REPLACE FUNCTION public.complete_chat_assignment(p_assignment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agent_id UUID;
BEGIN
  -- Get agent ID and mark as completed
  UPDATE public.chat_assignments
  SET status = 'completed',
      completed_at = now(),
      updated_at = now()
  WHERE id = p_assignment_id
  RETURNING assigned_to INTO v_agent_id;

  -- Decrease agent's current chat count
  IF v_agent_id IS NOT NULL THEN
    UPDATE public.agent_chat_availability
    SET current_chat_count = GREATEST(0, current_chat_count - 1),
        updated_at = now()
    WHERE user_id = v_agent_id;
  END IF;
END;
$$;

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_chat_availability;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chatbot_messages;