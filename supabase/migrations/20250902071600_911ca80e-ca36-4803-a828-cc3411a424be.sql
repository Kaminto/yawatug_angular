-- Add new relationship enum values (each in separate statement)
ALTER TYPE relationship_type ADD VALUE IF NOT EXISTS 'spouse';
ALTER TYPE relationship_type ADD VALUE IF NOT EXISTS 'child';  
ALTER TYPE relationship_type ADD VALUE IF NOT EXISTS 'partner';
ALTER TYPE relationship_type ADD VALUE IF NOT EXISTS 'colleague';