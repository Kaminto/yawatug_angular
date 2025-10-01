-- Fix critical RLS policy issues for core tables

-- Add RLS policies for ai_conversation_logs
CREATE POLICY "Users can view their own conversation logs" 
ON ai_conversation_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversation logs" 
ON ai_conversation_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add RLS policies for chatbot_knowledge (admin only)
CREATE POLICY "Admins can manage chatbot knowledge" 
ON chatbot_knowledge 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_role = 'admin'
  )
);

CREATE POLICY "Users can read active chatbot knowledge" 
ON chatbot_knowledge 
FOR SELECT 
USING (is_active = true);

-- Add RLS policies for media_gallery
CREATE POLICY "Anyone can view active media" 
ON media_gallery 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage media" 
ON media_gallery 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_role = 'admin'
  )
);

-- Add RLS policies for user_activity_logs
CREATE POLICY "Users can view their own activity logs" 
ON user_activity_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity logs" 
ON user_activity_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all activity logs" 
ON user_activity_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_role = 'admin'
  )
);

-- Add RLS policies for support_tickets
CREATE POLICY "Users can view their own support tickets" 
ON support_tickets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create support tickets" 
ON support_tickets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own support tickets" 
ON support_tickets 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all support tickets" 
ON support_tickets 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_role = 'admin'
  )
);

-- Add RLS policies for support_ticket_messages
CREATE POLICY "Users can view messages for their tickets" 
ON support_ticket_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM support_tickets 
    WHERE support_tickets.id = support_ticket_messages.ticket_id 
    AND support_tickets.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages for their tickets" 
ON support_ticket_messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM support_tickets 
    WHERE support_tickets.id = support_ticket_messages.ticket_id 
    AND support_tickets.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all ticket messages" 
ON support_ticket_messages 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_role = 'admin'
  )
);

-- Add RLS policies for announcements
CREATE POLICY "Anyone can view active announcements" 
ON announcements 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage announcements" 
ON announcements 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_role = 'admin'
  )
);

-- Fix security definer view by converting to security invoker
DROP VIEW IF EXISTS user_metrics_view;
CREATE VIEW user_metrics_view
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.created_at,
  p.verification_status,
  COUNT(t.id) as transaction_count,
  COALESCE(SUM(t.amount), 0) as total_transaction_amount
FROM profiles p
LEFT JOIN transactions t ON p.id = t.user_id
WHERE p.id = auth.uid() -- Only show current user's data
GROUP BY p.id, p.created_at, p.verification_status;