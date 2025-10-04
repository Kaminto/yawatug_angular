-- Create chatbot conversations table for logging
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  visitor_identifier TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  total_messages INTEGER DEFAULT 0,
  escalated_to_human BOOLEAN DEFAULT false,
  escalation_reason TEXT,
  user_feedback_rating INTEGER CHECK (user_feedback_rating BETWEEN 1 AND 5),
  user_feedback_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create chatbot messages table
CREATE TABLE IF NOT EXISTS public.chatbot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.chatbot_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'menu_action')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create chatbot quick actions/menu tracking
CREATE TABLE IF NOT EXISTS public.chatbot_quick_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key TEXT UNIQUE NOT NULL,
  action_label TEXT NOT NULL,
  action_description TEXT,
  action_category TEXT,
  target_route TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_chatbot_conversations_user_id ON public.chatbot_conversations(user_id);
CREATE INDEX idx_chatbot_conversations_session_id ON public.chatbot_conversations(session_id);
CREATE INDEX idx_chatbot_conversations_started_at ON public.chatbot_conversations(started_at DESC);
CREATE INDEX idx_chatbot_messages_conversation_id ON public.chatbot_messages(conversation_id);
CREATE INDEX idx_chatbot_messages_created_at ON public.chatbot_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_quick_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chatbot_conversations
CREATE POLICY "Users can view their own conversations"
  ON public.chatbot_conversations FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all conversations"
  ON public.chatbot_conversations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin'));

CREATE POLICY "System can insert conversations"
  ON public.chatbot_conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update conversations"
  ON public.chatbot_conversations FOR UPDATE
  USING (true);

-- RLS Policies for chatbot_messages
CREATE POLICY "Users can view messages from their conversations"
  ON public.chatbot_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chatbot_conversations 
      WHERE id = conversation_id 
      AND (user_id = auth.uid() OR user_id IS NULL)
    )
  );

CREATE POLICY "Admins can view all messages"
  ON public.chatbot_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin'));

CREATE POLICY "System can insert messages"
  ON public.chatbot_messages FOR INSERT
  WITH CHECK (true);

-- RLS Policies for chatbot_quick_actions
CREATE POLICY "Anyone can view active quick actions"
  ON public.chatbot_quick_actions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage quick actions"
  ON public.chatbot_quick_actions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin'));

-- Insert default quick actions
INSERT INTO public.chatbot_quick_actions (action_key, action_label, action_description, action_category, target_route, display_order) VALUES
  ('buy_shares', 'Buy Shares', 'Learn about purchasing Yawatu shares', 'investment', '/buy-shares', 1),
  ('wallet_info', 'My Wallet', 'Check wallet balance and transactions', 'wallet', '/wallet', 2),
  ('kyc_status', 'KYC Verification', 'Complete or check KYC status', 'account', '/kyc', 3),
  ('referral_program', 'Referral Program', 'Learn about earning through referrals', 'investment', '/referrals', 4),
  ('contact_support', 'Contact Support', 'Speak with a human assistant', 'support', null, 5)
ON CONFLICT (action_key) DO NOTHING;

-- Create function to update conversation timestamp
CREATE OR REPLACE FUNCTION update_chatbot_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chatbot_conversation_timestamp
  BEFORE UPDATE ON public.chatbot_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_chatbot_conversation_timestamp();