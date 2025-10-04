-- Create tables to log bulk reserve share imports and their rows
BEGIN;

-- Parent table: one record per bulk import
CREATE TABLE IF NOT EXISTS public.bulk_share_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NULL,
  share_id UUID NOT NULL,
  file_name TEXT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  summary JSONB NOT NULL DEFAULT '{}',
  notes TEXT NULL
);

-- Child table: one record per processed row
CREATE TABLE IF NOT EXISTS public.bulk_share_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.bulk_share_imports(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  email TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success','error')),
  message TEXT NULL,
  user_id UUID NULL,
  transaction_id UUID NULL
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_bulk_share_imports_share ON public.bulk_share_imports(share_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_share_import_rows_import ON public.bulk_share_import_rows(import_id);

-- Enable RLS and restrict to admins
ALTER TABLE public.bulk_share_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_share_import_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage bulk_share_imports" ON public.bulk_share_imports;
CREATE POLICY "Admins can manage bulk_share_imports" ON public.bulk_share_imports
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage bulk_share_import_rows" ON public.bulk_share_import_rows;
CREATE POLICY "Admins can manage bulk_share_import_rows" ON public.bulk_share_import_rows
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

COMMIT;