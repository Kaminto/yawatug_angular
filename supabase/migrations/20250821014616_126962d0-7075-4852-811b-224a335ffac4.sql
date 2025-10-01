-- Add new fields to admin_dynamic_pricing_settings for enhanced pricing control
ALTER TABLE admin_dynamic_pricing_settings 
ADD COLUMN IF NOT EXISTS market_activity_period text NOT NULL DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS update_interval_hours integer NOT NULL DEFAULT 24,
ADD COLUMN IF NOT EXISTS sensitivity_scale integer NOT NULL DEFAULT 5;

-- Add check constraint for sensitivity scale (1-10)
ALTER TABLE admin_dynamic_pricing_settings 
ADD CONSTRAINT sensitivity_scale_range CHECK (sensitivity_scale >= 1 AND sensitivity_scale <= 10);

-- Update existing records to use sensitivity scale instead of decimal weight
UPDATE admin_dynamic_pricing_settings 
SET sensitivity_scale = CASE 
  WHEN market_activity_weight <= 0.5 THEN 1
  WHEN market_activity_weight <= 1.0 THEN 3
  WHEN market_activity_weight <= 1.5 THEN 5
  WHEN market_activity_weight <= 2.0 THEN 7
  ELSE 10
END
WHERE sensitivity_scale = 5; -- Only update default values