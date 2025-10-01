-- Update relationship enum to include missing relationships
ALTER TYPE relationship_type ADD VALUE IF NOT EXISTS 'spouse';
ALTER TYPE relationship_type ADD VALUE IF NOT EXISTS 'child';
ALTER TYPE relationship_type ADD VALUE IF NOT EXISTS 'partner';
ALTER TYPE relationship_type ADD VALUE IF NOT EXISTS 'colleague';

-- Update any existing contacts that might have invalid relationships
UPDATE contact_persons 
SET relationship = 'other'::relationship_type 
WHERE relationship NOT IN ('parent', 'guardian', 'sibling', 'friend', 'director', 'other', 'spouse', 'child', 'partner', 'colleague');