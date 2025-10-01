-- Add missing columns to existing promotions table
ALTER TABLE public.promotions 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS offer_details JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'all',
ADD COLUMN IF NOT EXISTS value_amount NUMERIC,
ADD COLUMN IF NOT EXISTS value_currency TEXT DEFAULT 'UGX',
ADD COLUMN IF NOT EXISTS value_percentage NUMERIC,
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS max_uses INTEGER,
ADD COLUMN IF NOT EXISTS current_uses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT,
ADD COLUMN IF NOT EXISTS promo_code TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Update existing column names if needed
UPDATE public.promotions SET title = name WHERE title IS NULL AND name IS NOT NULL;
UPDATE public.promotions SET starts_at = start_date WHERE starts_at IS NULL AND start_date IS NOT NULL;
UPDATE public.promotions SET expires_at = end_date WHERE expires_at IS NULL AND end_date IS NOT NULL;
UPDATE public.promotions SET terms_and_conditions = terms_conditions WHERE terms_and_conditions IS NULL AND terms_conditions IS NOT NULL;
UPDATE public.promotions SET value_percentage = bonus_percentage WHERE value_percentage IS NULL AND bonus_percentage IS NOT NULL;
UPDATE public.promotions SET max_uses = max_participants WHERE max_uses IS NULL AND max_participants IS NOT NULL;
UPDATE public.promotions SET current_uses = current_participants WHERE current_uses IS NULL AND current_participants IS NOT NULL;