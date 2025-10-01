-- Create table for AI conversation logs
CREATE TABLE IF NOT EXISTS public.ai_conversation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  user_role TEXT NOT NULL DEFAULT 'user' CHECK (user_role IN ('admin', 'user')),
  session_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_conversation_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own conversation logs"
  ON public.ai_conversation_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversation logs"
  ON public.ai_conversation_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all logs
CREATE POLICY "Admins can view all conversation logs"
  ON public.ai_conversation_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ai_conversation_logs_user_id 
  ON public.ai_conversation_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_conversation_logs_session_id 
  ON public.ai_conversation_logs(session_id);

CREATE INDEX IF NOT EXISTS idx_ai_conversation_logs_created_at 
  ON public.ai_conversation_logs(created_at DESC);

-- Add missing UI components (ScrollArea and Progress)
-- These are just placeholders since they should be in shadcn components