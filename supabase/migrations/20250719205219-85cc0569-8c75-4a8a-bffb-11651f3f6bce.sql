-- Add new document types to the document_type enum
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'passport';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'guardian_id';