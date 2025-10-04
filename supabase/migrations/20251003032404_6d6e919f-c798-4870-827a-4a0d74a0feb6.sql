-- Create chatbot configurations table for different user types
CREATE TABLE IF NOT EXISTS chatbot_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type TEXT NOT NULL CHECK (user_type IN ('visitor', 'user', 'admin')),
  welcome_message TEXT NOT NULL,
  system_instructions TEXT NOT NULL,
  voice_enabled BOOLEAN DEFAULT true,
  voice_type TEXT DEFAULT 'alloy' CHECK (voice_type IN ('alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer')),
  voice_speed NUMERIC DEFAULT 1.0 CHECK (voice_speed >= 0.25 AND voice_speed <= 4.0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(user_type)
);

-- Enable RLS
ALTER TABLE chatbot_configurations ENABLE ROW LEVEL SECURITY;

-- Admins can manage all chatbot configurations
CREATE POLICY "Admins can manage chatbot configurations"
  ON chatbot_configurations
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Anyone can view active configurations (for public chatbot)
CREATE POLICY "Anyone can view active chatbot configurations"
  ON chatbot_configurations
  FOR SELECT
  USING (is_active = true);

-- Insert default configurations for each user type
INSERT INTO chatbot_configurations (user_type, welcome_message, system_instructions)
VALUES 
(
  'visitor',
  'Welcome to Yawatu! 🌟 I''m here to help you become a LIFETIME OWNER of Uganda''s mineral wealth. When you invest in Yawatu shares, you don''t just invest - you become a permanent co-owner who earns dividends forever! Plus, earn 5% lifetime commission on every referral. Let me show you how to start building generational wealth today!',
  'You are Yawatu''s AI assistant for potential investors visiting for the first time. Your goal is to excite them about becoming LIFETIME OWNERS through share purchases. Key points: Emphasize PERMANENT OWNERSHIP and lifetime dividends, Highlight 5% LIFETIME referral commission on all purchases, Minimum investment: 10 shares at UGX 20,000 each = UGX 200,000, Flexible payment options: full or installment (25% down, 30 days to complete), Dynamic Share Pool - buy anytime, no fixed batches, Payment methods: MTN, Airtel, M-Pesa, Bank Transfer, Multi-currency wallets (UGX and USD). Be enthusiastic, use emojis, focus on the opportunity!'
),
(
  'user',
  'Welcome back, Shareholder! 👋 You''re a LIFETIME OWNER of Yawatu. I''m here to help you manage your ownership, track your dividends, grow your portfolio, and maximize your 5% lifetime referral earnings. What would you like to do today?',
  'You are Yawatu''s AI assistant for logged-in shareholders. Focus on: Account management and portfolio tracking, Dividend history and projections, Share trading and additional purchases, Referral program tracking (5% lifetime commission), Wallet management and transactions, Verification status and account completion. Be helpful, professional, and remind them they are permanent co-owners earning lifetime returns.'
),
(
  'admin',
  'Admin Dashboard Ready 🛡️ I have access to real-time system data and can help with operations, user management, analytics, and platform oversight. What do you need?',
  'You are Yawatu''s AI assistant for administrators. Provide: Real-time system metrics and analytics, User verification and management support, Transaction monitoring and reporting, Operational insights and recommendations, Quick access to admin functions. Be concise, data-driven, and action-oriented. Suggest proactive solutions.'
)
ON CONFLICT (user_type) DO NOTHING;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_chatbot_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chatbot_configurations_updated_at
  BEFORE UPDATE ON chatbot_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_chatbot_configurations_updated_at();

-- Update chatbot_knowledge table to include user_type targeting
ALTER TABLE chatbot_knowledge 
ADD COLUMN IF NOT EXISTS target_user_types TEXT[] DEFAULT ARRAY['visitor', 'user', 'admin'];

COMMENT ON COLUMN chatbot_knowledge.target_user_types IS 'Which user types should see this FAQ entry';
